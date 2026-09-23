import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq, and, desc, count, avg } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { reviewSubmissionSchema } from '@/lib/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { parsePagination } from '@/lib/api/params';

// Public GET — returns approved reviews with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 12, maxLimit: 50 });
    const rating = searchParams.get('rating');


    // Build where conditions
    const conditions = [eq(reviews.status, 'approved')];

    if (rating) {
      const ratingNum = Number(rating);
      if (Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
        conditions.push(eq(reviews.rating, ratingNum));
      }
    }

    const whereClause = and(...conditions);

    // Public endpoint: select an explicit column list so reviewer_email (PII)
    // and internal fields are never exposed. All queries run in parallel.
    const [reviewRows, totalResult, [statsResult], breakdownRows] = await Promise.all([
      db
        .select({
          id: reviews.id,
          reviewerName: reviews.reviewerName,
          reviewerCity: reviews.reviewerCity,
          reviewerState: reviews.reviewerState,
          rating: reviews.rating,
          title: reviews.title,
          body: reviews.body,
          loanStatus: reviews.loanStatus,
          loanType: reviews.loanType,
          interestRateExperience: reviews.interestRateExperience,
          closedOnTime: reviews.closedOnTime,
          feesExperience: reviews.feesExperience,
          loanTerm: reviews.loanTerm,
          loanProgram: reviews.loanProgram,
          isFirstTimeBuyer: reviews.isFirstTimeBuyer,
          isSelfEmployed: reviews.isSelfEmployed,
          status: reviews.status,
          responseText: reviews.responseText,
          responseDate: reviews.responseDate,
          reviewDate: reviews.reviewDate,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(whereClause)
        .orderBy(desc(reviews.reviewDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(reviews)
        .where(whereClause),
      // Aggregate stats for all approved reviews
      db
        .select({
          totalReviews: count(),
          averageRating: avg(reviews.rating),
        })
        .from(reviews)
        .where(eq(reviews.status, 'approved')),
      // Rating breakdown
      db
        .select({
          rating: reviews.rating,
          count: count(),
        })
        .from(reviews)
        .where(eq(reviews.status, 'approved'))
        .groupBy(reviews.rating),
    ]);

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
    }, {
      // Approved reviews are public and identical for every visitor
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
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
