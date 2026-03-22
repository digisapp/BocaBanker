import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emails, clients } from '@/db/schema';
import { eq, desc, and, count, ilike, or } from 'drizzle-orm';

/**
 * GET /api/email/sent
 *
 * Fetch paginated outbound (sent) emails for the current user.
 * Supports: ?page, ?limit, ?status, ?search
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30') || 30));
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    const offset = (page - 1) * limit;

    const conditions = [
      eq(emails.userId, user.id),
      eq(emails.direction, 'outbound'),
    ];

    if (statusFilter) {
      conditions.push(eq(emails.status, statusFilter as 'sent' | 'delivered' | 'bounced' | 'failed' | 'replied'));
    }

    if (search) {
      conditions.push(
        or(
          ilike(emails.toEmail, `%${search}%`),
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
        toEmail: emails.toEmail,
        subject: emails.subject,
        template: emails.template,
        status: emails.status,
        resendId: emails.resendId,
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

    return NextResponse.json({
      emails: results,
      total: totalResult?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.total || 0) / limit),
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Sent emails fetch error', error);
    return apiError('Internal server error');
  }
}
