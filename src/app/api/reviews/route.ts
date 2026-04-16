import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq, and, desc, count, avg } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { reviewSubmissionSchema } from '@/lib/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Public GET — returns approved reviews with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '12')));
    const rating = searchParams.get('rating');

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(reviews.status, 'approved')];

    if (rating) {
      conditions.push(eq(reviews.rating, Number(rating)));
    }

    const whereClause = and(...conditions);

    // Query reviews and total count
    const [reviewRows, totalResult] = await Promise.all([
      db
        .select()
        .from(reviews)
        .where(whereClause)
        .orderBy(desc(reviews.reviewDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(reviews)
        .where(whereClause),
    ]);

    // Get aggregate stats for all approved reviews
    const [statsResult] = await db
      .select({
        totalReviews: count(),
        averageRating: avg(reviews.rating),
      })
      .from(reviews)
      .where(eq(reviews.status, 'approved'));

    // Get rating breakdown
    const breakdownRows = await db
      .select({
        rating: reviews.rating,
        count: count(),
      })
      .from(reviews)
      .where(eq(reviews.status, 'approved'))
      .groupBy(reviews.rating);

    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const row of breakdownRows) {
      ratingBreakdown[row.rating] = row.count;
    }

    const total = totalResult[0]?.total ?? 0;
    const avgRating = statsResult?.averageRating ? parseFloat(statsResult.averageRating) : 0;

    return NextResponse.json({
      reviews: reviewRows,
      total,
      page,
      limit,
      averageRating: Math.round(avgRating * 100) / 100,
      totalReviews: statsResult?.totalReviews ?? 0,
      ratingBreakdown,
    });
  } catch (error) {
    logger.error('reviews-api', 'GET /api/reviews error', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// Public POST — submit a new review (pending moderation)
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 reviews per hour per IP
    const ip = getClientIp(request);
    const rl = await rateLimit(`reviews:${ip}`, { maxRequests: 5, windowMs: 3_600_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = reviewSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const [created] = await db
      .insert(reviews)
      .values({
        reviewerName: data.reviewer_name,
        reviewerEmail: data.reviewer_email || null,
        reviewerCity: data.reviewer_city || null,
        reviewerState: data.reviewer_state || null,
        rating: data.rating,
        title: data.title,
        body: data.body,
        loanType: data.loan_type || null,
        loanTerm: data.loan_term || null,
        closedOnTime: data.closed_on_time ?? null,
        isFirstTimeBuyer: data.is_first_time_buyer ?? null,
        isSelfEmployed: data.is_self_employed ?? null,
        status: 'pending',
        reviewDate: new Date().toISOString().split('T')[0],
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error('reviews-api', 'POST /api/reviews error', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
