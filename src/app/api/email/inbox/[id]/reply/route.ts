import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails } from '@/db/schema';
import { sendEmail } from '@/lib/email/resend';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/email/inbox/[id]/reply
 *
 * Reply to an email. Includes threading and quoted original.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { html, subject: customSubject } = body;

    if (!html) {
      return apiError('Reply body (html) is required', 400);
    }

    // Fetch the original email
    const [originalEmail] = await db
      .select()
      .from(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, user.id)))
      .limit(1);

    if (!originalEmail) {
      return apiError('Email not found', 404);
    }

    // Build reply subject
    const replySubject =
      customSubject ||
      (originalEmail.subject.startsWith('Re:')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`);

    // Build reply HTML with quoted original
    const quotedOriginal = originalEmail.bodyHtml || originalEmail.bodyText || '';
    const fullHtml = `
      ${html}
      <br/>
      <div style="border-left: 2px solid #d4a855; padding-left: 12px; margin-top: 16px; color: #666;">
        <p style="font-size: 12px; color: #999; margin-bottom: 8px;">
          On ${new Date(originalEmail.createdAt!).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}, ${originalEmail.fromName || originalEmail.fromEmail} wrote:
        </p>
        ${quotedOriginal}
      </div>
    `.trim();

    // Determine thread ID
    const threadId = originalEmail.threadId || originalEmail.id;

    // Send reply via Resend
    const result = await sendEmail({
      to: originalEmail.fromEmail,
      subject: replySubject,
      html: fullHtml,
      userId: user.id,
      clientId: originalEmail.clientId || undefined,
      template: 'reply',
      threadId,
      inReplyToId: originalEmail.id,
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to send reply', 500);
    }

    // Update original email status to 'replied'
    await db
      .update(emails)
      .set({ status: 'replied' })
      .where(eq(emails.id, id));

    return NextResponse.json({ success: true, resendId: result.resendId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Reply error', error);
    return apiError('Internal server error');
  }
}
