import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { parsePagination } from '@/lib/api/params';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { AdminInboxService, isBulkAction, isInboxFolder } from '@/lib/email/admin-inbox';
import { parseEmailIds } from '@/lib/email/ids';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/email/inbox?folder=inbox|unread|starred|sent|spam&search=&page=&limit=
 *
 * One page of a folder plus the folder badge counts.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const folderParam = searchParams.get('folder') || 'inbox';
    const folder = isInboxFolder(folderParam) ? folderParam : 'inbox';
    const search = (searchParams.get('search') || '').trim().slice(0, 200);
    const { page, limit } = parsePagination(searchParams, { defaultLimit: 25, maxLimit: 50 });

    const [list, counts] = await Promise.all([
      AdminInboxService.listEmails({ folder, search: search || undefined, page, limit }),
      AdminInboxService.getFolderCounts(),
    ]);

    return NextResponse.json({ ...list, folder, counts });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox fetch error', error);
    return apiError('Internal server error');
  }
}

/**
 * POST /api/email/inbox — compose or reply.
 * Body: { to, subject, bodyText, replyToEmailId? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    // Bound outbound volume (sender reputation + abuse of a compromised account).
    const rl = await rateLimit(`email-send:${user.id}`, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.success) {
      return apiError('Too many emails sent. Please wait a minute and try again.', 429);
    }

    const body = await request.json().catch(() => ({}));
    const to = typeof body.to === 'string' ? body.to : '';
    const subject = typeof body.subject === 'string' ? body.subject.slice(0, 300) : '';
    const bodyText = typeof body.bodyText === 'string' ? body.bodyText.slice(0, 20_000) : '';
    const replyToEmailId = typeof body.replyToEmailId === 'string' ? body.replyToEmailId : undefined;

    if (!to.trim() || !subject.trim() || !bodyText.trim()) {
      return apiError('To, subject and message are required', 400);
    }
    if (replyToEmailId && !parseEmailIds({ emailId: replyToEmailId })) {
      return apiError('Email not found', 404);
    }

    const result = await AdminInboxService.sendNewEmail({ to, subject, bodyText, replyToEmailId, userId: user.id });

    if (!result.success) {
      const status = /valid email|required|no longer exists/i.test(result.error || '') ? 400 : 502;
      return apiError(result.error || 'Failed to send email', status);
    }

    return NextResponse.json({ success: true, id: result.id, threadId: result.threadId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox send error', error);
    return apiError('Internal server error');
  }
}

/**
 * PUT /api/email/inbox — bulk actions.
 * Body: { emailIds: string[], action: markRead|markUnread|star|unstar|spam|notSpam|delete }
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));

    const ids = parseEmailIds(body, 200);
    if (!ids) return apiError('emailIds (UUIDs, max 200) required', 400);
    if (!isBulkAction(body.action)) return apiError('Unknown action', 400);

    await AdminInboxService.bulk(body.action, ids);
    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Bulk action error', error);
    return apiError('Internal server error');
  }
}

/**
 * DELETE /api/email/inbox — bulk delete.
 * Body: { emailId: string } or { emailIds: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));

    const ids = parseEmailIds(body, 200);
    if (!ids) return apiError('emailId or emailIds (UUIDs, max 200) required', 400);

    await AdminInboxService.bulk('delete', ids);
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Bulk delete error', error);
    return apiError('Internal server error');
  }
}
