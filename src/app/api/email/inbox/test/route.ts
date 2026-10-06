import { NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { AdminInboxService } from '@/lib/email/admin-inbox';
import { getInboundAddress, isValidEmail } from '@/lib/email/inbound-address';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/email/inbox/test — send a round-trip test to the signed-in admin.
 *
 * Proves the whole loop, not just sending: the mail goes out through the
 * normal reply path (team@ From, per-thread Reply-To), so replying to it
 * from the admin's own mailbox must land back in /email under the same
 * thread. If the reply never shows up, receiving (DNS / webhook) is the part
 * that's broken — see /api/email/inbox/status.
 */
export async function POST() {
  try {
    const user = await requireAdmin();
    const to = (user.email || '').trim().toLowerCase();
    if (!isValidEmail(to)) {
      return apiError('Your admin account has no email address to send to', 400);
    }

    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
    const subject = `Boca Banker inbox test · ${stamp}`;
    const bodyText = [
      'This is a test from the Boca Banker inbox.',
      '',
      'Reply to this email. Your reply should appear in the Email page within a minute, in the same thread as this message.',
      '',
      `Replies are routed through ${getInboundAddress()} (per-thread plus address). If nothing arrives, receiving is not set up yet — the Email page shows what is missing.`,
      '',
      '— Boca Banker',
    ].join('\n');

    const result = await AdminInboxService.sendNewEmail({ to, subject, bodyText, userId: user.id, test: true });
    if (!result.success) {
      return apiError(result.error || 'Send failed', 502);
    }
    return NextResponse.json({ success: true, to, id: result.id, threadId: result.threadId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox test send error', error);
    return apiError('Internal server error');
  }
}
