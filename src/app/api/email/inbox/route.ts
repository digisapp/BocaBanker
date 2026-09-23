import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails, clients } from '@/db/schema';
import { eq, desc, and, count, ilike, or, inArray, isNull, sql } from 'drizzle-orm';
import { isUuid, escapeLike, parseEmailIds } from '@/lib/email/ids';

/**
 * These routes are admin-only (requireAdmin). The admin can see emails
 * assigned to them plus legacy rows with NULL user_id (inbound mail stored
 * before owner assignment existed).
 */
function adminOwnerFilter(userId: string) {
  return or(eq(emails.userId, userId), isNull(emails.userId))!;
}

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
    const search = searchParams.get('search')?.trim().slice(0, 200);
    const threadIdParam = searchParams.get('thread_id');
    if (threadIdParam && !isUuid(threadIdParam)) {
      return apiError('Invalid thread_id', 400);
    }

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
          adminOwnerFilter(user.id),
          or(eq(emails.id, threadIdParam), eq(emails.threadId, threadIdParam)),
        ))
        .orderBy(emails.createdAt)
        .limit(100);

      return NextResponse.json({ emails: threadEmails, thread: true });
    }

    const conditions = [
      adminOwnerFilter(user.id),
      eq(emails.direction, 'inbound'),
    ];

    if (readFilter === 'true') conditions.push(eq(emails.isRead, true));
    if (readFilter === 'false') conditions.push(eq(emails.isRead, false));

    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      conditions.push(
        or(
          ilike(emails.fromEmail, pattern),
          ilike(emails.fromName, pattern),
          ilike(emails.subject, pattern),
          ilike(clients.firstName, pattern),
          ilike(clients.lastName, pattern),
        )!
      );
    }

    const whereClause = and(...conditions);

    // List view: no bodies/drafts (can be hundreds of KB each) — the detail
    // endpoint loads those on demand.
    const results = await db
      .select({
        id: emails.id,
        fromEmail: emails.fromEmail,
        fromName: emails.fromName,
        toEmail: emails.toEmail,
        subject: emails.subject,
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
      })
      .from(emails)
      .leftJoin(clients, eq(emails.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(emails.createdAt))
      .limit(limit)
      .offset(offset);

    const [[totalResult], [unreadResult]] = await Promise.all([
      db
        .select({ total: count() })
        .from(emails)
        .leftJoin(clients, eq(emails.clientId, clients.id))
        .where(whereClause),
      db
        .select({ total: count() })
        .from(emails)
        .where(and(
          adminOwnerFilter(user.id),
          eq(emails.direction, 'inbound'),
          eq(emails.isRead, false),
        )),
    ]);

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

    const ids = parseEmailIds(body);
    if (!ids) return apiError('emailId or emailIds (UUIDs, max 500) required', 400);

    // Always mark read; only flip status to 'read' from 'received' so
    // replied/forwarded statuses are preserved.
    const updated = await db
      .update(emails)
      .set({
        isRead: true,
        readAt: new Date(),
        status: sql`CASE WHEN ${emails.status} = 'received' THEN 'read' ELSE ${emails.status} END`,
      })
      .where(and(
        inArray(emails.id, ids),
        adminOwnerFilter(user.id),
      ))
      .returning({ id: emails.id });

    return NextResponse.json({ success: true, updated: updated.length });
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

    const ids = parseEmailIds(body);
    if (!ids) return apiError('emailId or emailIds (UUIDs, max 500) required', 400);

    // Verify ownership first, then clean up thread references and delete —
    // all inside a transaction so references are never cleared for emails
    // that don't end up deleted.
    const deletedCount = await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: emails.id })
        .from(emails)
        .where(and(inArray(emails.id, ids), adminOwnerFilter(user.id)));

      const ownedIds = owned.map((e) => e.id);
      if (ownedIds.length === 0) return 0;

      await tx
        .update(emails)
        .set({ threadId: null })
        .where(inArray(emails.threadId, ownedIds));

      await tx
        .update(emails)
        .set({ inReplyToId: null })
        .where(inArray(emails.inReplyToId, ownedIds));

      const deleted = await tx
        .delete(emails)
        .where(inArray(emails.id, ownedIds))
        .returning({ id: emails.id });

      return deleted.length;
    });

    return NextResponse.json({ success: true, deleted: deletedCount });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Bulk delete error', error);
    return apiError('Internal server error');
  }
}
