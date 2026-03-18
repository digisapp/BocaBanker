import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq, and, ilike, or, desc, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
    const status = searchParams.get('status') ?? '';
    const search = searchParams.get('search') ?? '';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(reviews.status, status as 'pending' | 'approved' | 'rejected'));
    }

    if (search) {
      conditions.push(
        or(
          ilike(reviews.reviewerName, `%${search}%`),
          ilike(reviews.title, `%${search}%`),
          ilike(reviews.body, `%${search}%`)
        )!
      );
    }

    const finalWhere = conditions.length > 0 ? and(...conditions) : undefined;

    // Query reviews and total count
    const [reviewRows, totalResult] = await Promise.all([
      db
        .select()
        .from(reviews)
        .where(finalWhere)
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(reviews)
        .where(finalWhere),
    ]);

    // Get counts per status
    const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
      db.select({ total: count() }).from(reviews).where(eq(reviews.status, 'pending')),
      db.select({ total: count() }).from(reviews).where(eq(reviews.status, 'approved')),
      db.select({ total: count() }).from(reviews).where(eq(reviews.status, 'rejected')),
    ]);

    return NextResponse.json({
      reviews: reviewRows,
      total: totalResult[0]?.total ?? 0,
      page,
      limit,
      stats: {
        pending: pendingResult[0]?.total ?? 0,
        approved: approvedResult[0]?.total ?? 0,
        rejected: rejectedResult[0]?.total ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('reviews-admin-api', 'GET /api/reviews/admin error', error);
    return apiError('Failed to fetch reviews');
  }
}
