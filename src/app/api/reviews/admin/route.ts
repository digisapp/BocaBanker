import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq, ilike, or, desc, count, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
    const statusFilter = searchParams.get('status') ?? '';
    const search = searchParams.get('search') ?? '';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(reviews.status, statusFilter as 'pending' | 'approved' | 'rejected'));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(reviews.reviewerName, pattern),
          ilike(reviews.title, pattern),
          ilike(reviews.body, pattern),
        )!
      );
    }

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : sql`${conditions[0]} AND ${conditions[1]}`;

    // Fetch reviews
    const rows = await db
      .select()
      .from(reviews)
      .where(where)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(reviews)
      .where(where);

    // Get counts per status
    const [pendingCount] = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, 'pending'));
    const [approvedCount] = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, 'approved'));
    const [rejectedCount] = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, 'rejected'));

    return NextResponse.json({
      reviews: rows,
      total,
      page,
      limit,
      stats: {
        pending: pendingCount.total,
        approved: approvedCount.total,
        rejected: rejectedCount.total,
      },
    });
  } catch (error) {
    logger.error('reviews-admin-api', 'GET /api/reviews/admin error', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
