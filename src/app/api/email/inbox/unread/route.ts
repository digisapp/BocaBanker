import { NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/email/inbox/unread — unread inbound (non-spam) count, for the nav badge. */
export async function GET() {
  try {
    await requireAdmin();
    const count = await AdminInboxService.getUnreadCount();
    return NextResponse.json({ count });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Unread count error', error);
    return apiError('Internal server error');
  }
}
