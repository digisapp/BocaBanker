import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { emailLogs, clients } from '@/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(emailLogs.userId, user.id)];

    if (statusFilter) {
      conditions.push(
        eq(
          emailLogs.status,
          statusFilter as 'sent' | 'delivered' | 'bounced' | 'failed'
        )
      );
    }

    if (clientId) {
      conditions.push(eq(emailLogs.clientId, clientId));
    }

    const whereClause = and(...conditions);

    // Fetch logs
    const logs = await db
      .select({
        id: emailLogs.id,
        toEmail: emailLogs.toEmail,
        subject: emailLogs.subject,
        template: emailLogs.template,
        status: emailLogs.status,
        resendId: emailLogs.resendId,
        sentAt: emailLogs.sentAt,
        clientId: emailLogs.clientId,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(emailLogs)
      .leftJoin(clients, eq(emailLogs.clientId, clients.id))
      .where(whereClause)
      .orderBy(desc(emailLogs.sentAt))
      .limit(limit)
      .offset(offset);

    // Count total
    const [totalResult] = await db
      .select({ total: count() })
      .from(emailLogs)
      .where(whereClause);

    return NextResponse.json({
      logs,
      total: totalResult?.total || 0,
      page,
      limit,
      totalPages: Math.ceil((totalResult?.total || 0) / limit),
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('email-api', 'Email history error', error);
    return apiError('Internal server error');
  }
}
