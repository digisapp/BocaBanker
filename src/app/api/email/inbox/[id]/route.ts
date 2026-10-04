import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { requireUuid } from '@/lib/api/params';
import { logger } from '@/lib/logger';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/email/inbox/[id] — one email plus its thread (oldest first).
 * Reading does not mark it read; the client PATCHes { isRead: true }.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const id = requireUuid((await params).id, 'Email not found');

    const email = await AdminInboxService.getEmail(id);
    if (!email) return apiError('Email not found', 404);

    const thread = await AdminInboxService.getThread(email.threadId || email.id);
    return NextResponse.json({ email, thread: thread.length > 0 ? thread : [email] });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email fetch error', error);
    return apiError('Internal server error');
  }
}

/**
 * PATCH /api/email/inbox/[id]
 * Body: { isRead?, isStarred?, isSpam? } — or { useAiDraft: true } to send
 * the AI's suggested reply as is.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const id = requireUuid((await params).id, 'Email not found');
    const body = await request.json().catch(() => ({}));

    if (body.useAiDraft === true) {
      const email = await AdminInboxService.getEmail(id);
      if (!email) return apiError('Email not found', 404);
      if (email.direction !== 'inbound') return apiError('Only inbound mail has a draft', 400);
      if (!email.aiDraftText) return apiError('No AI draft available', 400);
      if (email.status === 'replied') return apiError('This email was already answered', 409);

      const result = await AdminInboxService.sendNewEmail({
        to: email.fromEmail,
        subject: /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`,
        bodyText: email.aiDraftText,
        replyToEmailId: id,
        userId: user.id,
      });
      if (!result.success) {
        return apiError(result.error || 'Failed to send AI draft', 502);
      }
      return NextResponse.json({ success: true, sent: true, id: result.id });
    }

    const flags: Array<[string, (_v: boolean) => Promise<void>]> = [
      ['isRead', (v) => AdminInboxService.markRead(id, v)],
      ['isStarred', (v) => AdminInboxService.setStar(id, v)],
      ['isSpam', (v) => AdminInboxService.markSpam(id, v)],
    ];
    let touched = 0;
    for (const [key, apply] of flags) {
      if (typeof body[key] === 'boolean') {
        await apply(body[key]);
        touched++;
      }
    }
    if (touched === 0) return apiError('Nothing to update', 400);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email update error', error);
    return apiError('Internal server error');
  }
}

/**
 * DELETE /api/email/inbox/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const id = requireUuid((await params).id, 'Email not found');
    await AdminInboxService.deleteEmail(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email delete error', error);
    return apiError('Internal server error');
  }
}
