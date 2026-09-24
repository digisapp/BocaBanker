import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews } from '@/db/schema';
import { getPublicReviews } from '@/lib/reviews';
import { logger } from '@/lib/logger';
import { reviewSubmissionSchema } from '@/lib/validation/schemas';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { parsePagination } from '@/lib/api/params';

// Public GET — returns approved reviews with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, offset } = parsePagination(searchParams, { defaultLimit: 12, maxLimit: 50 });
    const rating = Number(searchParams.get('rating')) || null;

    const result = await getPublicReviews({ limit, offset, rating });

    return NextResponse.json({ ...result, page, limit }, {
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
