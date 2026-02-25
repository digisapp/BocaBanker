import { Resend } from 'resend';
import { db } from '@/db';
import { emailLogs } from '@/db/schema';
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
}

interface SendEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

/**
 * Send a single email via Resend and log it to the email_logs table.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, userId, clientId, template } = params;

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Boca Banker <noreply@bocabanker.com>',
      to,
      subject,
      html,
    });

    if (error) {
      // Log the failed attempt
      await db.insert(emailLogs).values({
        userId,
        clientId: clientId || null,
        toEmail: to,
        subject,
        template: template || null,
        status: 'failed',
        resendId: null,
      });

      return { success: false, error: error.message };
    }

    // Log the successful send
    await db.insert(emailLogs).values({
      userId,
      clientId: clientId || null,
      toEmail: to,
      subject,
      template: template || null,
      status: 'sent',
      resendId: data?.id || null,
    });

    return { success: true, resendId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    // Log the error
    try {
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
