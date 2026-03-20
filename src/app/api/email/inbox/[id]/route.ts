import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails, clients } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/email/inbox/[id]
 *
 * Fetch a single email with its full thread, mark as read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;

    const [email] = await db
      .select({
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
        createdAt: emails.createdAt,
        clientId: emails.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientEmail: clients.email,
      })
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
        .set({ isRead: true, status: email.status === 'received' ? 'read' : email.status })
        .where(eq(emails.id, id));
    }

    // Fetch thread (all emails in the same thread)
    let thread: typeof email[] = [];
    const threadId = email.threadId || id;

    const threadEmails = await db
      .select({
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
        createdAt: emails.createdAt,
        clientId: emails.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientEmail: clients.email,
      })
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(and(
        eq(emails.userId, user.id),
        eq(emails.threadId, threadId),
      ))
      .orderBy(desc(emails.createdAt));

    thread = threadEmails.length > 0 ? threadEmails : [{ ...email, isRead: true }];

    return NextResponse.json({
      ...email,
      isRead: true,
      status: email.status === 'received' ? 'read' : email.status,
      thread,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox email fetch error', error);
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
    const user = await requireAdmin();
    const { id } = await params;

    await db
      .delete(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox email delete error', error);
    return apiError('Internal server error');
  }
}
