import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    const status = searchParams.get('status') ?? '';
    const search = searchParams.get('search') ?? '';

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('reviews')
      .select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      const s = search.replace(/[%_\\]/g, (c) => `\\${c}`);
      query = query.or(
        `reviewer_name.ilike.%${s}%,title.ilike.%${s}%,body.ilike.%${s}%`
      );
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: rows, count: total, error } = await query;

    if (error) {
      logger.error('reviews-admin-api', 'Supabase query error', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Get counts per status
    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      supabaseAdmin.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabaseAdmin.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);

    const reviews = (rows || []).map((r: Record<string, unknown>) => ({
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
    }));

    return NextResponse.json({
      reviews,
      total: total ?? 0,
      page,
      limit,
      stats: {
        pending: pendingRes.count ?? 0,
        approved: approvedRes.count ?? 0,
        rejected: rejectedRes.count ?? 0,
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
