import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { loans } from '@/db/schema';
import { loanSchema } from '@/lib/validation/schemas';

const SORT_COLUMNS: Record<string, string> = {
  borrowerName: 'borrower_name',
  propertyAddress: 'property_address',
  loanAmount: 'loan_amount',
  loanType: 'loan_type',
  status: 'status',
  interestRate: 'interest_rate',
  estimatedClosingDate: 'estimated_closing_date',
  createdAt: 'created_at',
};

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
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '10')));
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const loanType = searchParams.get('loanType') ?? '';
    const sort = searchParams.get('sort') ?? 'createdAt';
    const order = searchParams.get('order') ?? 'desc';

    const offset = (page - 1) * limit;
    const sortColumn = SORT_COLUMNS[sort] || 'created_at';
    const ascending = order === 'asc';

    let query = supabaseAdmin
      .from('loans')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (search) {
      const s = search.replace(/[%_\\]/g, (c) => `\\${c}`);
      query = query.or(
        `borrower_name.ilike.%${s}%,property_address.ilike.%${s}%,borrower_email.ilike.%${s}%,lender_name.ilike.%${s}%`
      );
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (loanType && loanType !== 'all') {
      query = query.eq('loan_type', loanType);
    }

    query = query
      .order(sortColumn, { ascending })
      .range(offset, offset + limit - 1);

    const { data: rows, count: total, error } = await query;

    if (error) {
      logger.error('loans-api', 'Supabase query error', error);
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
    }

    const loanRows = (rows || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.user_id,
      borrowerName: r.borrower_name,
      borrowerEmail: r.borrower_email,
      borrowerPhone: r.borrower_phone,
      propertyAddress: r.property_address,
      propertyCity: r.property_city,
      propertyState: r.property_state,
      propertyZip: r.property_zip,
      purchasePrice: r.purchase_price,
      loanAmount: r.loan_amount,
      loanType: r.loan_type,
      interestRate: r.interest_rate,
      term: r.term,
      status: r.status,
      ariveLink: r.arive_link,
      ariveLinkSentAt: r.arive_link_sent_at,
      estimatedClosingDate: r.estimated_closing_date,
      actualClosingDate: r.actual_closing_date,
      commissionBps: r.commission_bps,
      commissionAmount: r.commission_amount,
      lenderId: r.lender_id,
      lenderName: r.lender_name,
      leadId: r.lead_id,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({
      loans: loanRows,
      total: total ?? 0,
      page,
      limit,
    });
  } catch (error) {
    logger.error('loans-api', 'GET /api/loans error', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = loanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Auto-calculate commission amount from loan amount and bps
    let commissionAmount: string | null = null;
    if (data.commission_bps && data.loan_amount) {
      commissionAmount = ((data.loan_amount * data.commission_bps) / 10000).toFixed(2);
    }

    const [created] = await db
      .insert(loans)
      .values({
        userId: user.id,
        borrowerName: data.borrower_name,
        borrowerEmail: data.borrower_email || null,
        borrowerPhone: data.borrower_phone || null,
        propertyAddress: data.property_address,
        propertyCity: data.property_city || null,
        propertyState: data.property_state || 'FL',
        propertyZip: data.property_zip || null,
        purchasePrice: data.purchase_price?.toString() ?? null,
        loanAmount: data.loan_amount.toString(),
        loanType: data.loan_type,
        interestRate: data.interest_rate?.toString() ?? null,
        term: data.term ?? null,
        status: data.status,
        ariveLink: data.arive_link || null,
        estimatedClosingDate: data.estimated_closing_date || null,
        actualClosingDate: data.actual_closing_date || null,
        commissionBps: data.commission_bps ?? null,
        commissionAmount,
        lenderName: data.lender_name || null,
        leadId: data.lead_id || null,
        notes: data.notes || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error('loans-api', 'POST /api/loans error', error);
    return NextResponse.json(
      { error: 'Failed to create loan' },
      { status: 500 }
    );
  }
}
