import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

function mapLoan(r: Record<string, unknown>) {
  return {
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
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: loan, error } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json(mapLoan(loan));
  } catch (error) {
    logger.error('loans-api', 'GET /api/loans/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify loan exists and belongs to user
    const { data: existing } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Auto-calculate commission
    const loanAmount = parseFloat(body.loan_amount ?? body.loanAmount ?? '0');
    const bps = body.commission_bps ?? body.commissionBps ?? null;
    let commissionAmount: string | null = null;
    if (bps != null && loanAmount > 0) {
      commissionAmount = ((loanAmount * bps) / 10000).toFixed(2);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('loans')
      .update({
        borrower_name: body.borrower_name ?? body.borrowerName,
        borrower_email: body.borrower_email ?? body.borrowerEmail ?? null,
        borrower_phone: body.borrower_phone ?? body.borrowerPhone ?? null,
        property_address: body.property_address ?? body.propertyAddress,
        property_city: body.property_city ?? body.propertyCity ?? null,
        property_state: body.property_state ?? body.propertyState ?? 'FL',
        property_zip: body.property_zip ?? body.propertyZip ?? null,
        purchase_price: body.purchase_price ?? body.purchasePrice ?? null,
        loan_amount: body.loan_amount ?? body.loanAmount,
        loan_type: body.loan_type ?? body.loanType,
        interest_rate: body.interest_rate ?? body.interestRate ?? null,
        term: body.term ?? null,
        status: body.status,
        arive_link: body.arive_link ?? body.ariveLink ?? null,
        estimated_closing_date: body.estimated_closing_date ?? body.estimatedClosingDate ?? null,
        actual_closing_date: body.actual_closing_date ?? body.actualClosingDate ?? null,
        commission_bps: bps,
        commission_amount: commissionAmount,
        lender_name: body.lender_name ?? body.lenderName ?? null,
        lead_id: body.lead_id ?? body.leadId ?? null,
        notes: body.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('loans-api', 'Supabase update error', error);
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }

    return NextResponse.json(mapLoan(updated));
  } catch (error) {
    logger.error('loans-api', 'PUT /api/loans/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to update loan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('loans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      logger.error('loans-api', 'Supabase delete error', error);
      return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('loans-api', 'DELETE /api/loans/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to delete loan' },
      { status: 500 }
    );
  }
}
