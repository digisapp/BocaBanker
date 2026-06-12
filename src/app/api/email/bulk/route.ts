import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { clients } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/resend';
import {
  outreachTemplate,
  followUpTemplate,
  reportDeliveryTemplate,
} from '@/lib/email/templates';

// Bulk sends are throttled to ~2/s; allow long-running invocations on Vercel.
export const maxDuration = 300;

const VALID_TEMPLATES = ['outreach', 'follow-up', 'report-delivery'] as const;

/**
 * Simple rate-limited delay.
 * Resend's default rate limit is 2 requests per second.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error?: string): boolean {
  if (!error) return false;
  return /429|rate.?limit|too many requests/i.test(error);
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const {
      clientIds,
      filter,
      template,
      subject,
      customMessage,
    } = body;

    if (!template || !subject) {
      return apiError('template and subject are required', 400);
    }

    if (!VALID_TEMPLATES.includes(template)) {
      return apiError(
        `Unknown template "${template}". Valid templates: ${VALID_TEMPLATES.join(', ')}`,
        400
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
      return apiError('No valid recipients found', 400);
    }

    const senderName = user.user_metadata?.full_name || 'Boca Banker';

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < validRecipients.length; i++) {
      const client = validRecipients[i];

      // Per-recipient isolation: an unexpected failure for one recipient is
      // recorded as a failure and the loop continues, so we always return
      // accurate sent/failed accounting.
      try {
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
          default:
            // Unreachable: template is validated above
            throw new Error(`Unknown template: ${template}`);
        }

        let result = await sendEmail({
          to: client.email!,
          subject,
          html,
          userId: user.id,
          clientId: client.id,
          template,
        });

        // On rate limiting (429), wait 1s and retry once before recording failure
        if (!result.success && isRateLimitError(result.error)) {
          logger.warn('email-api', `Rate limited sending to ${client.email}, retrying in 1s`);
          await delay(1000);
          result = await sendEmail({
            to: client.email!,
            subject,
            html,
            userId: user.id,
            clientId: client.id,
            template,
          });
        }

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        logger.error('email-api', `Bulk send failed for ${client.email}`, err);
      }

      // Rate limit: Resend default is 2 req/s = 500ms between each
      if (i < validRecipients.length - 1) {
        await delay(500);
      }
    }

    return NextResponse.json({
      success: true,
      total: validRecipients.length,
      sent,
      failed,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Bulk email error', error);
    return apiError('Internal server error');
  }
}
