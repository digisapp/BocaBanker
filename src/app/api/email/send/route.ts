import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import {
  outreachTemplate,
  followUpTemplate,
  reportDeliveryTemplate,
} from '@/lib/email/templates';
import { emailSchema } from '@/lib/validation/email-schemas';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { isUuid } from '@/lib/email/ids';

const VALID_TEMPLATES = ['outreach', 'follow-up', 'report-delivery'] as const;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Bound outbound volume per user (sender reputation + abuse of a
    // compromised account). Bulk sends go through /api/email/bulk.
    const rl = await rateLimit(`email-send:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.success) {
      return apiError('Too many emails sent. Please wait a minute and try again.', 429);
    }

    const body = await request.json();
    const { to, subject, html, template, clientId, clientName, senderName, propertyAddress, studyName, totalSavings, customMessage } = body;

    // Validate recipient + subject with the shared email schema
    // (its `body` field maps to this route's `html`, which may instead be
    // template-generated, so validate it only when provided).
    const parsed = emailSchema
      .pick({ to_email: true, subject: true, template: true })
      .safeParse({ to_email: to, subject, template });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // clientId links the email into a client's history — only allow the
    // caller's own clients.
    if (clientId !== undefined && clientId !== null && clientId !== '') {
      if (!isUuid(clientId)) return apiError('Invalid clientId', 400);
      const [owned] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
        .limit(1);
      if (!owned) return apiError('Client not found', 404);
    }

    if (template && !VALID_TEMPLATES.includes(template)) {
      return apiError(
        `Unknown template "${template}". Valid templates: ${VALID_TEMPLATES.join(', ')}`,
        400
      );
    }

    // If a template is specified but no HTML, generate from template
    let emailHtml = html;
    if (template && !html) {
      const sender = senderName || user.user_metadata?.full_name || 'Boca Banker';
      const client = clientName || 'there';

      switch (template) {
        case 'outreach':
          emailHtml = outreachTemplate({ clientName: client, senderName: sender, customMessage });
          break;
        case 'follow-up':
          emailHtml = followUpTemplate({ clientName: client, senderName: sender, propertyAddress });
          break;
        case 'report-delivery':
          emailHtml = reportDeliveryTemplate({
            clientName: client,
            studyName: studyName || 'Cost Segregation Study',
            totalSavings: totalSavings || '$0',
          });
          break;
      }
    }

    if (!emailHtml) {
      return apiError('html content or template is required', 400);
    }

    const result = await sendEmail({
      to,
      subject,
      html: emailHtml,
      userId: user.id,
      clientId: clientId || undefined,
      template,
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to send email', 500);
    }

    return NextResponse.json({ success: true, resendId: result.resendId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email send error', error);
    return apiError('Internal server error');
  }
}
