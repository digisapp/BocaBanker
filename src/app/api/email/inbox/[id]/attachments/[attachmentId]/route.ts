import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { requireUuid } from '@/lib/api/params';
import { logger } from '@/lib/logger';
import { AdminInboxService, readMetadata } from '@/lib/email/admin-inbox';
import { getResend, isResendConfigured } from '@/lib/email/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/email/inbox/[id]/attachments/[attachmentId]
 *
 * Attachment bytes never touch our storage: Resend keeps them with the
 * received email and hands out a short-lived download URL. We look the
 * attachment up (admin-only) and redirect to that URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    await requireAdmin();
    const { id: rawId, attachmentId } = await params;
    const id = requireUuid(rawId, 'Attachment not found');
    if (!isResendConfigured()) return apiError('Resend is not configured', 503);

    const email = await AdminInboxService.getEmail(id);
    if (!email || email.direction !== 'inbound' || !email.resendId) {
      return apiError('Attachment not found', 404);
    }
    // Only ids we recorded from the webhook — never a free lookup on Resend.
    const known = readMetadata(email.metadata).attachments?.some((a) => a.id === attachmentId);
    if (!known) return apiError('Attachment not found', 404);

    const { data, error } = await getResend().emails.receiving.attachments.get({ emailId: email.resendId, id: attachmentId });
    if (error || !data?.download_url) {
      logger.error('email-api', `Attachment lookup failed: ${error?.message}`);
      return apiError('Attachment is no longer available', 502);
    }

    return NextResponse.redirect(data.download_url, { status: 302, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Attachment error', error);
    return apiError('Internal server error');
  }
}
