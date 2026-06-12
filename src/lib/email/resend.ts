import { Resend } from 'resend';
import { db } from '@/db';
import { emailLogs, emails } from '@/db/schema';
import { logger } from '@/lib/logger';

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export interface SendEmailAttachment {
  content: string;
  filename: string;
  contentType?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
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
    to, subject, html, userId, clientId, template, threadId, inReplyToId,
    inReplyToMessageId, referencesMessageIds, attachments,
  } = params;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Boca Banker <team@bocabanker.com>';

  // RFC threading headers so replies thread correctly in recipients' mail clients
  const headers: Record<string, string> = {};
  if (inReplyToMessageId) {
    headers['In-Reply-To'] = angleWrap(inReplyToMessageId);
  }
  const references = (referencesMessageIds || []).filter(Boolean).map(angleWrap);
  if (references.length > 0) {
    headers['References'] = references.join(' ');
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to,
      subject,
      html,
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
    });

    const status = error ? 'failed' : 'sent';
    const resendId = data?.id || null;

    // Write to unified emails table
    const [inserted] = await db.insert(emails).values({
      userId,
      clientId: clientId || null,
      direction: 'outbound',
      fromEmail: fromEmail.includes('<') ? fromEmail.match(/<(.+)>/)?.[1] || fromEmail : fromEmail,
      fromName: fromEmail.includes('<') ? fromEmail.match(/^(.+?)\s*</)?.[1] || null : null,
      toEmail: to,
      subject,
      bodyHtml: html,
      template: template || null,
      status,
      resendId,
      threadId: threadId || null,
      inReplyToId: inReplyToId || null,
      isRead: true,
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
      return { success: false, error: error.message };
    }

    return { success: true, resendId: data?.id, emailId: inserted?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    try {
      await db.insert(emails).values({
        userId,
        clientId: clientId || null,
        direction: 'outbound',
        fromEmail: fromEmail.includes('<') ? fromEmail.match(/<(.+)>/)?.[1] || fromEmail : fromEmail,
        toEmail: to,
        subject,
        bodyHtml: html,
        template: template || null,
        status: 'failed',
        isRead: true,
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
