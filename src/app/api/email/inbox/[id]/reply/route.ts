import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails } from '@/db/schema';
import { sendEmail, type SendEmailAttachment } from '@/lib/email/resend';
import { eq, and, or, isNull } from 'drizzle-orm';

/**
 * POST /api/email/inbox/[id]/reply
 *
 * Reply to an email with quoted original and optional attachments.
 * Body: { html, subject?, attachments?: [{ content, filename, contentType? }] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { html, subject: customSubject, attachments: rawAttachments } = body;

    if (!html) {
      return apiError('Reply body (html) is required', 400);
    }

    // Validate attachments shape: [{ content, filename, contentType? }]
    let attachments: SendEmailAttachment[] | undefined;
    if (rawAttachments !== undefined) {
      if (!Array.isArray(rawAttachments)) {
        return apiError('attachments must be an array', 400);
      }
      const valid = rawAttachments.every(
        (a: unknown) =>
          a !== null &&
          typeof a === 'object' &&
          typeof (a as Record<string, unknown>).content === 'string' &&
          typeof (a as Record<string, unknown>).filename === 'string'
      );
      if (!valid) {
        return apiError('Each attachment requires string content and filename', 400);
      }
      attachments = (rawAttachments as SendEmailAttachment[]).map((a) => ({
        content: a.content,
        filename: a.filename,
        ...(typeof a.contentType === 'string' ? { contentType: a.contentType } : {}),
      }));
    }

    // Admin-only route: admin can reply to their emails and legacy NULL-owner rows
    const [originalEmail] = await db
      .select()
      .from(emails)
      .where(and(
        eq(emails.id, id),
        or(eq(emails.userId, user.id), isNull(emails.userId)),
      ))
      .limit(1);

    if (!originalEmail) {
      return apiError('Email not found', 404);
    }

    // Build reply subject
    const replySubject =
      customSubject ||
      (/^re:/i.test(originalEmail.subject)
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`);

    // Build reply with quoted original
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

    const threadId = originalEmail.threadId || originalEmail.id;

    // RFC threading headers from the original inbound email's Message-ID
    const originalMessageId =
      (originalEmail.metadata as Record<string, unknown> | null)?.messageId;
    const inReplyToMessageId =
      typeof originalMessageId === 'string' ? originalMessageId : null;

    // Send via Resend with attachments if provided
    const result = await sendEmail({
      to: originalEmail.fromEmail,
      subject: replySubject,
      html: fullHtml,
      userId: user.id,
      clientId: originalEmail.clientId || undefined,
      template: 'reply',
      threadId,
      inReplyToId: originalEmail.id,
      inReplyToMessageId,
      referencesMessageIds: inReplyToMessageId ? [inReplyToMessageId] : null,
      attachments,
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to send reply', 500);
    }

    // Update original email status
    await db
      .update(emails)
      .set({ status: 'replied', repliedAt: new Date() })
      .where(eq(emails.id, id));

    return NextResponse.json({ success: true, resendId: result.resendId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Reply error', error);
    return apiError('Internal server error');
  }
}
