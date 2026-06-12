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

const VALID_TEMPLATES = ['outreach', 'follow-up', 'report-delivery'] as const;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

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
      clientId,
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
