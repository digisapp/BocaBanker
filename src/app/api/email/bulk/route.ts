import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/resend';
import {
  outreachTemplate,
  followUpTemplate,
  reportDeliveryTemplate,
  welcomeTemplate,
} from '@/lib/email/templates';

/**
 * Simple rate-limited delay.
 * Ensures we do not exceed ~10 emails per second for Resend rate limits.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const {
      clientIds,
      filter,
      template,
      subject,
      customMessage,
    } = body;

    if (!template || !subject) {
      return NextResponse.json(
        { error: 'template and subject are required' },
        { status: 400 }
      );
    }

    // Fetch recipients
    let recipientList: { id: string; email: string | null; firstName: string; lastName: string }[];

    if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
      // Specific client IDs
      const allClients = await db.query.clients.findMany({
        where: and(
          eq(clients.userId, user.id),
          isNotNull(clients.email)
        ),
      });
      recipientList = allClients.filter((c) => clientIds.includes(c.id));
    } else {
      // Filter-based
      const conditions = [eq(clients.userId, user.id), isNotNull(clients.email)];

      if (filter && filter !== 'all') {
        conditions.push(
          eq(clients.status, filter as 'active' | 'prospect' | 'inactive')
        );
      }

      recipientList = await db.query.clients.findMany({
        where: and(...conditions),
      });
    }

    // Filter out clients without email
    const validRecipients = recipientList.filter(
      (c) => c.email && c.email.trim() !== ''
    );

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients found' },
        { status: 400 }
      );
    }

    const senderName = user.user_metadata?.full_name || 'Boca Banker';

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < validRecipients.length; i++) {
      const client = validRecipients[i];
      const clientName = `${client.firstName} ${client.lastName}`.trim();

      let html: string;
      switch (template) {
        case 'outreach':
          html = outreachTemplate({ clientName, senderName, customMessage });
          break;
        case 'follow-up':
          html = followUpTemplate({ clientName, senderName });
          break;
        case 'report-delivery':
          html = reportDeliveryTemplate({
            clientName,
            studyName: 'Cost Segregation Study',
            totalSavings: 'See report for details',
          });
          break;
        case 'welcome':
          html = welcomeTemplate({ clientName });
          break;
        default:
          html = `<p>${subject}</p>`;
      }

      const result = await sendEmail({
        to: client.email!,
        subject,
        html,
        userId: user.id,
        clientId: client.id,
        template,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limit: max 10 per second = 100ms between each
      if (i < validRecipients.length - 1) {
        await delay(100);
      }
    }

    return NextResponse.json({
      success: true,
      total: validRecipients.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
