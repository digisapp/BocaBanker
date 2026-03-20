import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails, clients } from '@/db/schema';
import { eq, desc, and, count, ilike, or } from 'drizzle-orm';

/**
 * GET /api/email/inbox
 *
 * Fetch paginated inbound emails for the current user.
 * Supports: ?page, ?limit, ?read (true/false), ?search
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const readFilter = searchParams.get('read');
    const search = searchParams.get('search')?.trim();

    const offset = (page - 1) * limit;

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
        createdAt: emails.createdAt,
        clientId: emails.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
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
