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

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  userId: string;
  clientId?: string;
  template?: string;
  threadId?: string;
  inReplyToId?: string;
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
  const { to, subject, html, userId, clientId, template, threadId, inReplyToId } = params;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Boca Banker <team@bocabanker.com>';

  try {
    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to,
      subject,
      html,
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
