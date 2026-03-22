import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails, clients } from '@/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';

const emailSelectFields = {
  id: emails.id,
  direction: emails.direction,
  fromEmail: emails.fromEmail,
  fromName: emails.fromName,
  toEmail: emails.toEmail,
  subject: emails.subject,
  bodyHtml: emails.bodyHtml,
  bodyText: emails.bodyText,
  status: emails.status,
  isRead: emails.isRead,
  resendId: emails.resendId,
  threadId: emails.threadId,
  inReplyToId: emails.inReplyToId,
  template: emails.template,
  createdAt: emails.createdAt,
  readAt: emails.readAt,
  repliedAt: emails.repliedAt,
  clientId: emails.clientId,
  clientFirstName: clients.firstName,
  clientLastName: clients.lastName,
  clientEmail: clients.email,
  aiDraftHtml: emails.aiDraftHtml,
  aiDraftText: emails.aiDraftText,
  aiCategory: emails.aiCategory,
  aiConfidence: emails.aiConfidence,
  aiSummary: emails.aiSummary,
  aiProcessedAt: emails.aiProcessedAt,
};

/**
 * GET /api/email/inbox/[id]
 *
 * Fetch a single email with thread and AI data. Marks as read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    const [email] = await db
      .select(emailSelectFields)
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(and(eq(emails.id, id), eq(emails.userId, user.id)))
      .limit(1);

    if (!email) {
      return apiError('Email not found', 404);
    }

    // Mark as read
    if (!email.isRead) {
      await db
        .update(emails)
        .set({
          isRead: true,
          status: email.status === 'received' ? 'read' : email.status,
          readAt: new Date(),
        })
        .where(eq(emails.id, id));
    }

    // Fetch thread
    const threadId = email.threadId || id;
    const threadEmails = await db
      .select(emailSelectFields)
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(and(
        eq(emails.userId, user.id),
        or(eq(emails.id, threadId), eq(emails.threadId, threadId)),
      ))
      .orderBy(desc(emails.createdAt));

    const thread = threadEmails.length > 0
      ? threadEmails
      : [{ ...email, isRead: true }];

    return NextResponse.json({
      ...email,
      isRead: true,
      status: email.status === 'received' ? 'read' : email.status,
      thread,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email fetch error', error);
    return apiError('Internal server error');
  }
}

/**
 * DELETE /api/email/inbox/[id]
 *
 * Delete single email with thread reference cleanup.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    // Clear thread references
    await db.update(emails).set({ threadId: null }).where(eq(emails.threadId, id));
    await db.update(emails).set({ inReplyToId: null }).where(eq(emails.inReplyToId, id));

    await db
      .delete(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email delete error', error);
    return apiError('Internal server error');
  }
}
