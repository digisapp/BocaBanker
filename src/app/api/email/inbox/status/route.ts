import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { getInboxStatus } from '@/lib/email/inbox-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/email/inbox/status[?fresh=1] — can this inbox receive mail right now? */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const fresh = new URL(request.url).searchParams.get('fresh') === '1';
    const status = await getInboxStatus({ fresh });
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox status error', error);
    return apiError('Internal server error');
  }
}
