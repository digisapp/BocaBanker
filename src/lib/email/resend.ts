import { Resend } from 'resend';
import { db } from '@/db';
import { emailLogs, emails } from '@/db/schema';
import { logger } from '@/lib/logger';
import { getFrom, getInboundAddress, parseEmailAddress } from './inbound-address';

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
  threadId?: string;
  inReplyToId?: string;
  /** RFC Message-ID of the email being replied to (with or without angle brackets). */
  inReplyToMessageId?: string | null;
  /** RFC Message-IDs for the References header (with or without angle brackets). */
  referencesMessageIds?: string[] | null;
  attachments?: SendEmailAttachment[];
  /**
   * Where a reply to this email goes. Defaults to the inbox address (see
   * inbound-address.ts) so "just reply to this email" lands in /email
   * instead of wherever the From mailbox points. Pass `null` to send with
   * no Reply-To at all.
   */
  replyTo?: string | null;
  /**
   * Resend idempotency key: a retried call with the same key (webhook
   * retries, double clicks) is delivered once. Unique per logical send.
   */
  idempotencyKey?: string;
  metadata?: OutboundEmailMetadata;
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

/**
 * Send a single email via Resend and log it to both emails and email_logs tables.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    to, subject, html, text, userId, clientId, template, threadId, inReplyToId,
    inReplyToMessageId, referencesMessageIds, attachments, replyTo, idempotencyKey, metadata,
  } = params;
  const from = getFrom();
  const { name: fromName, email: fromEmail } = parseEmailAddress(from);

  // undefined → the inbox; null → explicitly none.
  const resolvedReplyTo = replyTo === undefined ? getInboundAddress() : replyTo;

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

  try {
    // The SDK takes camelCase (`replyTo`) and maps it to the API's `reply_to`
    // itself; a snake_case key here is silently dropped.
    const { data, error } = await getResend().emails.send(
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

    const status = error ? 'failed' : 'sent';
    const resendId = data?.id || null;

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
      threadId: threadId || null,
      inReplyToId: inReplyToId || null,
      isRead: true,
      metadata: rowMetadata,
    }).returning({ id: emails.id });

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

    if (error) {
      return { success: false, error: error.message, emailId: inserted?.id };
    }

    return { success: true, resendId: data?.id, emailId: inserted?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    try {
      await db.insert(emails).values({
        userId,
        clientId: clientId || null,
        direction: 'outbound',
        fromEmail,
        fromName,
        toEmail: to,
        subject,
        bodyHtml: html,
        bodyText: text || null,
        template: template || null,
        status: 'failed',
        isRead: true,
        metadata: rowMetadata,
      });

      await db.insert(emailLogs).values({
        userId,
        clientId: clientId || null,
        toEmail: to,
        subject,
        template: template || null,
        status: 'failed',
        resendId: null,
      });
    } catch {
      logger.error('resend', 'Failed to log email error to database');
    }

    return { success: false, error: errorMessage };
  }
}
