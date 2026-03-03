import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { reviewSubmissionSchema } from '@/lib/validation/schemas';

// Public GET — returns approved reviews with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '12')));
    const ratingFilter = searchParams.get('rating');

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(reviews.status, 'approved')];
    if (ratingFilter) {
      conditions.push(eq(reviews.rating, Number(ratingFilter)));
    }

    const where = conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`;

    // Fetch reviews
    const rows = await db
      .select()
      .from(reviews)
      .where(where)
      .orderBy(desc(reviews.reviewDate))
      .limit(limit)
      .offset(offset);

    // Total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(reviews)
      .where(where);

    // Aggregate stats (all approved, ignoring rating filter)
    const allApproved = await db
      .select({ rating: reviews.rating })
      .from(reviews)
      .where(eq(reviews.status, 'approved'));

    const ratings = allApproved.map(r => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    const ratingBreakdown = {
      5: ratings.filter(r => r === 5).length,
      4: ratings.filter(r => r === 4).length,
      3: ratings.filter(r => r === 3).length,
      2: ratings.filter(r => r === 2).length,
      1: ratings.filter(r => r === 1).length,
    };

    return NextResponse.json({
      reviews: rows,
      total,
      page,
      limit,
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews: ratings.length,
      ratingBreakdown,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('reviews-api', 'GET /api/reviews error', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reviews',
        debug: {
          message: err.message,
          cause: (error as Record<string, unknown>)?.cause,
          code: (error as Record<string, unknown>)?.code,
          severity: (error as Record<string, unknown>)?.severity,
          detail: (error as Record<string, unknown>)?.detail,
        },
      },
      { status: 500 }
    );
  }
}

// Public POST — submit a new review (pending moderation)
export async function POST(request: NextRequest) {
  try {
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
