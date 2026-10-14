import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { db } from '@/db';
import { emailLogs, emails } from '@/db/schema';
import { logger } from '@/lib/logger';
import { getFrom, getInboundAddress, parseEmailAddress, threadReplyAddress } from './inbound-address';

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/** True when the API key is set, i.e. sending (and the inbox status check) can work. */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export interface SendEmailAttachment {
  content: string;
  filename: string;
  contentType?: string;
}

/** JSON stored in `emails.metadata` for a row we sent. */
export interface OutboundEmailMetadata {
  headers?: Record<string, string>;
  /** Set on the "Send me a test" row so the UI can label it. */
  test?: boolean;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Plain-text part. Also what the list preview and quoting use. */
  text?: string;
  userId: string | null;
  clientId?: string;
  template?: string;
  /** Thread this row belongs to. Omitted → the row starts a new thread. */
  threadId?: string;
  inReplyToId?: string;
  /** RFC Message-ID of the email being replied to (with or without angle brackets). */
  inReplyToMessageId?: string | null;
  /** RFC Message-IDs for the References header (with or without angle brackets). */
  referencesMessageIds?: string[] | null;
  attachments?: SendEmailAttachment[];
  /**
   * Where a reply to this email goes. Defaults to the inbox address, plus-
   * tagged with the thread (team+<threadId>@…, see inbound-address.ts), so
   * "just reply to this email" lands in /email, in this thread, instead of
   * wherever the From mailbox points. Pass `null` to send with no Reply-To
   * at all.
   */
  replyTo?: string | null;
  /**
   * Resend idempotency key: a retried call with the same key (webhook
   * retries, double clicks) is delivered once. Unique per logical send.
   */
  idempotencyKey?: string;
  metadata?: OutboundEmailMetadata;
  /**
   * Retry once (after RATE_LIMIT_RETRY_MS) when Resend answers with its
   * per-second rate limit, before anything is recorded. For bulk loops.
   */
  retryOnRateLimit?: boolean;
}

/** Wrap a bare RFC message-id in angle brackets if needed. */
function angleWrap(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith('<') ? trimmed : `<${trimmed}>`;
}

interface SendEmailResult {
  success: boolean;
  resendId?: string;
  emailId?: string;
  error?: string;
}

type ResendSendResult = Awaited<ReturnType<Resend['emails']['send']>>;

/** How long to wait before the one retry of a rate-limited send (`retryOnRateLimit`). */
export const RATE_LIMIT_RETRY_MS = 1000;

/**
 * Resend's per-second rate limit (worth one retry). The daily / monthly
 * quota errors are also 429s but will not clear in a second.
 */
function isRateLimited(error: ResendSendResult['error']): boolean {
  if (!error) return false;
  if (error.name === 'rate_limit_exceeded') return true;
  return error.statusCode === 429 && !/quota/i.test(error.name || '');
}

/**
 * Send a single email via Resend and log it to both emails and email_logs tables.
 *
 * Once Resend has accepted the message it is out, so the result is a success
 * even if recording it fails: reporting failure there makes the user send it
 * again and the recipient gets it twice. A failed recording is logged loudly
 * instead.
 *
 * Every logged row is a thread: without a `threadId` a new one is started,
 * and with the default Reply-To the reply address carries it
 * (team+<threadId>@…), so an answer to a template, bulk or Arive-link email
 * joins this row's thread in /email.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    to, subject, html, text, userId, clientId, template, inReplyToId,
    inReplyToMessageId, referencesMessageIds, attachments, replyTo, idempotencyKey, metadata,
    retryOnRateLimit = false,
  } = params;
  const from = getFrom();
  const { name: fromName, email: fromEmail } = parseEmailAddress(from);
  const threadId = params.threadId || randomUUID();

  // undefined → the inbox, tagged with this thread; null → explicitly none.
  const resolvedReplyTo = replyTo === undefined ? threadReplyAddress(threadId, getInboundAddress()) : replyTo;

  // RFC threading headers so replies thread correctly in recipients' mail clients
  const headers: Record<string, string> = {};
  if (inReplyToMessageId) {
    headers['In-Reply-To'] = angleWrap(inReplyToMessageId);
  }
  const references = (referencesMessageIds || []).filter(Boolean).map(angleWrap);
  if (references.length > 0) {
    headers['References'] = references.join(' ');
  }

  const rowMetadata: OutboundEmailMetadata = { ...(metadata || {}) };
  if (Object.keys(headers).length > 0) rowMetadata.headers = headers;

  /** Record the attempt in emails + email_logs. Never throws; returns the emails row id. */
  const record = async (status: 'sent' | 'failed', resendId: string | null): Promise<string | undefined> => {
    let emailId: string | undefined;
    try {
      // Write to unified emails table
      const [inserted] = await db.insert(emails).values({
        userId,
        clientId: clientId || null,
        direction: 'outbound',
        fromEmail,
        fromName,
        toEmail: to,
        replyTo: resolvedReplyTo || null,
        subject,
        bodyHtml: html,
        bodyText: text || null,
        template: template || null,
        status,
        resendId,
        threadId,
        inReplyToId: inReplyToId || null,
        isRead: true,
        metadata: rowMetadata,
      }).returning({ id: emails.id });
      emailId = inserted?.id;

      // Also write to legacy email_logs for dashboard stats
      await db.insert(emailLogs).values({
        userId,
        clientId: clientId || null,
        toEmail: to,
        subject,
        template: template || null,
        status,
        resendId,
      });
    } catch (dbErr) {
      const table = emailId ? 'email_logs' : 'emails';
      logger.error(
        'resend',
        status === 'sent'
          ? `Email to ${to} WAS SENT (Resend id ${resendId}) but could not be recorded in ${table}${emailId ? '' : ' — it will be missing from Sent'}`
          : `Failed send to ${to} could not be recorded in ${table}`,
        dbErr,
      );
    }
    return emailId;
  };

  const send = () =>
    // The SDK takes camelCase (`replyTo`) and maps it to the API's `reply_to`
    // itself; a snake_case key here is silently dropped.
    getResend().emails.send(
      {
        from,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(resolvedReplyTo ? { replyTo: resolvedReplyTo } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(attachments && attachments.length > 0
          ? {
              attachments: attachments.map((a) => ({
                content: a.content,
                filename: a.filename,
                ...(a.contentType ? { contentType: a.contentType } : {}),
              })),
            }
          : {}),
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

  let result: ResendSendResult;
  try {
    result = await send();
    // A rate-limited attempt is retried once before anything is recorded, so
    // a retried send leaves one row, not a "Failed" one next to a "Sent" one.
    if (retryOnRateLimit && isRateLimited(result.error)) {
      logger.warn('resend', `Rate limited sending to ${to}, retrying in ${RATE_LIMIT_RETRY_MS}ms`);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_MS));
      result = await send();
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await record('failed', null);
    return { success: false, error: errorMessage };
  }

  const { data, error } = result;
  if (error || !data) {
    const emailId = await record('failed', null);
    return { success: false, error: error?.message || 'Unknown error', emailId };
  }

  // Resend accepted it: the mail is out. Success from here on, whatever the
  // bookkeeping does.
  const emailId = await record('sent', data.id);
  return { success: true, resendId: data.id, emailId };
}
