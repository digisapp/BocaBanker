import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { reviewSubmissionSchema } from '@/lib/validation/schemas';

function mapReview(r: Record<string, unknown>) {
  return {
    id: r.id,
    reviewerName: r.reviewer_name,
    reviewerEmail: r.reviewer_email,
    reviewerCity: r.reviewer_city,
    reviewerState: r.reviewer_state,
    rating: r.rating,
    title: r.title,
    body: r.body,
    loanStatus: r.loan_status,
    loanType: r.loan_type,
    interestRateExperience: r.interest_rate_experience,
    closedOnTime: r.closed_on_time,
    feesExperience: r.fees_experience,
    loanTerm: r.loan_term,
    loanProgram: r.loan_program,
    isFirstTimeBuyer: r.is_first_time_buyer,
    isSelfEmployed: r.is_self_employed,
    status: r.status,
    responseText: r.response_text,
    responseDate: r.response_date,
    reviewDate: r.review_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Public GET — returns approved reviews with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '12')));
    const rating = searchParams.get('rating');

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    if (rating) {
      query = query.eq('rating', Number(rating));
    }

    query = query
      .order('review_date', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data: rows, count: total, error } = await query;

    if (error) {
      logger.error('reviews-api', 'Supabase query error', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Get aggregate stats
    const { data: allApproved } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('status', 'approved');

    const ratings = (allApproved || []).map((r: { rating: number }) => r.rating);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 0;

    const ratingBreakdown = {
      5: ratings.filter((r: number) => r === 5).length,
      4: ratings.filter((r: number) => r === 4).length,
      3: ratings.filter((r: number) => r === 3).length,
      2: ratings.filter((r: number) => r === 2).length,
      1: ratings.filter((r: number) => r === 1).length,
    };

    return NextResponse.json({
      reviews: (rows || []).map((r: Record<string, unknown>) => mapReview(r)),
      total: total ?? 0,
      page,
      limit,
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews: ratings.length,
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
    const body = await request.json();
    const parsed = reviewSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const { data: created, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        reviewer_name: data.reviewer_name,
        reviewer_email: data.reviewer_email || null,
        reviewer_city: data.reviewer_city || null,
        reviewer_state: data.reviewer_state || null,
        rating: data.rating,
        title: data.title,
        body: data.body,
        loan_type: data.loan_type || null,
        loan_term: data.loan_term || null,
        closed_on_time: data.closed_on_time ?? null,
        is_first_time_buyer: data.is_first_time_buyer ?? null,
        is_self_employed: data.is_self_employed ?? null,
        status: 'pending',
        review_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      logger.error('reviews-api', 'Supabase insert error', error);
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    return NextResponse.json(mapReview(created), { status: 201 });
  } catch (error) {
    logger.error('reviews-api', 'POST /api/reviews error', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
