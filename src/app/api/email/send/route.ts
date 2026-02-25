import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import {
  outreachTemplate,
  followUpTemplate,
  reportDeliveryTemplate,
} from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, html, template, clientId, clientName, senderName, propertyAddress, studyName, totalSavings, customMessage } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'to and subject are required' },
        { status: 400 }
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
        default:
          emailHtml = `<p>${subject}</p>`;
      }
    }

    if (!emailHtml) {
      return NextResponse.json(
        { error: 'html content or template is required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, resendId: result.resendId });
  } catch (error) {
    logger.error('email-api', 'Email send error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
