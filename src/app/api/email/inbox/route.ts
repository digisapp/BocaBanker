import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails, clients } from '@/db/schema';
import { eq, desc, and, count, ilike, or, inArray } from 'drizzle-orm';

/**
 * GET /api/email/inbox
 *
 * Fetch paginated inbound emails. Supports: ?page, ?limit, ?read, ?search, ?thread_id
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30') || 30));
    const readFilter = searchParams.get('read');
    const search = searchParams.get('search')?.trim();
    const threadIdParam = searchParams.get('thread_id');

    const offset = (page - 1) * limit;

    // Thread view: return all emails in a thread
    if (threadIdParam) {
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
          template: emails.template,
          threadId: emails.threadId,
          createdAt: emails.createdAt,
          aiCategory: emails.aiCategory,
          aiConfidence: emails.aiConfidence,
          aiSummary: emails.aiSummary,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
        .from(emails)
        .leftJoin(clients, eq(emails.clientId, clients.id))
        .where(and(
          eq(emails.userId, user.id),
          or(eq(emails.id, threadIdParam), eq(emails.threadId, threadIdParam)),
        ))
        .orderBy(emails.createdAt);

      return NextResponse.json({ emails: threadEmails, thread: true });
    }

    const conditions = [
      eq(emails.userId, user.id),
      eq(emails.direction, 'inbound'),
    ];

    if (readFilter === 'true') conditions.push(eq(emails.isRead, true));
    if (readFilter === 'false') conditions.push(eq(emails.isRead, false));

    if (search) {
      conditions.push(
        or(
          ilike(emails.fromEmail, `%${search}%`),
          ilike(emails.fromName, `%${search}%`),
          ilike(emails.subject, `%${search}%`),
          ilike(clients.firstName, `%${search}%`),
          ilike(clients.lastName, `%${search}%`),
        )!
      );
    }

    const whereClause = and(...conditions);

    const results = await db
      .select({
        id: emails.id,
        fromEmail: emails.fromEmail,
        fromName: emails.fromName,
        toEmail: emails.toEmail,
        subject: emails.subject,
        bodyText: emails.bodyText,
        status: emails.status,
        isRead: emails.isRead,
        threadId: emails.threadId,
        template: emails.template,
        createdAt: emails.createdAt,
        clientId: emails.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        aiCategory: emails.aiCategory,
        aiConfidence: emails.aiConfidence,
        aiSummary: emails.aiSummary,
        aiDraftHtml: emails.aiDraftHtml,
      })
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(emails.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ total: count() })
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(whereClause);

    const [unreadResult] = await db
      .select({ total: count() })
      .from(emails)
      .where(and(
        eq(emails.userId, user.id),
        eq(emails.direction, 'inbound'),
        eq(emails.isRead, false),
      ));

    return NextResponse.json({
      emails: results,
      total: totalResult?.total || 0,
      unread: unreadResult?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.total || 0) / limit),
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Inbox fetch error', error);
    return apiError('Internal server error');
  }
}

/**
 * PATCH /api/email/inbox
 *
 * Bulk mark emails as read.
 * Body: { emailId: string } or { emailIds: string[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    const ids: string[] = body.emailIds || (body.emailId ? [body.emailId] : []);
    if (ids.length === 0) return apiError('emailId or emailIds required', 400);

    await db
      .update(emails)
      .set({ isRead: true, status: 'read', readAt: new Date() })
      .where(and(
        inArray(emails.id, ids),
        eq(emails.userId, user.id),
        eq(emails.status, 'received'),
      ));

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Bulk mark-read error', error);
    return apiError('Internal server error');
  }
}

/**
 * DELETE /api/email/inbox
 *
 * Bulk delete emails with thread reference cleanup.
 * Body: { emailId: string } or { emailIds: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();

    const ids: string[] = body.emailIds || (body.emailId ? [body.emailId] : []);
    if (ids.length === 0) return apiError('emailId or emailIds required', 400);

    // Clear thread references pointing to these emails
    await db
      .update(emails)
      .set({ threadId: null })
      .where(inArray(emails.threadId, ids));

    await db
      .update(emails)
      .set({ inReplyToId: null })
      .where(inArray(emails.inReplyToId, ids));

    // Delete
    await db
      .delete(emails)
      .where(and(inArray(emails.id, ids), eq(emails.userId, user.id)));

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Bulk delete error', error);
    return apiError('Internal server error');
  }
}
