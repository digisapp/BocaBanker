import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { loans } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    const [loan] = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    if (!loan) {
      return apiError('Loan not found', 404);
    }

    return NextResponse.json(loan);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'GET /api/loans/[id] error', error);
    return apiError('Failed to fetch loan');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const body = await request.json();

    // Verify loan exists and belongs to user
    const [existing] = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    if (!existing) {
      return apiError('Loan not found', 404);
    }

    // Auto-calculate commission
    const loanAmount = parseFloat(body.loan_amount ?? body.loanAmount ?? '0');
    const bps = body.commission_bps ?? body.commissionBps ?? null;
    let commissionAmount: string | null = null;
    if (bps != null && loanAmount > 0) {
      commissionAmount = ((loanAmount * bps) / 10000).toFixed(2);
    }

    const [updated] = await db
      .update(loans)
      .set({
        borrowerName: body.borrower_name ?? body.borrowerName,
        borrowerEmail: body.borrower_email ?? body.borrowerEmail ?? null,
        borrowerPhone: body.borrower_phone ?? body.borrowerPhone ?? null,
        propertyAddress: body.property_address ?? body.propertyAddress,
        propertyCity: body.property_city ?? body.propertyCity ?? null,
        propertyState: body.property_state ?? body.propertyState ?? 'FL',
        propertyZip: body.property_zip ?? body.propertyZip ?? null,
        purchasePrice: body.purchase_price ?? body.purchasePrice ?? null,
        loanAmount: body.loan_amount ?? body.loanAmount,
        loanType: body.loan_type ?? body.loanType,
        interestRate: body.interest_rate ?? body.interestRate ?? null,
        term: body.term ?? null,
        status: body.status,
        ariveLink: body.arive_link ?? body.ariveLink ?? null,
        estimatedClosingDate: body.estimated_closing_date ?? body.estimatedClosingDate ?? null,
        actualClosingDate: body.actual_closing_date ?? body.actualClosingDate ?? null,
        commissionBps: bps,
        commissionAmount,
        lenderName: body.lender_name ?? body.lenderName ?? null,
        leadId: body.lead_id ?? body.leadId ?? null,
        notes: body.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(loans.id, id))
      .returning();

    if (!updated) {
      return apiError('Failed to update loan', 500);
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'PUT /api/loans/[id] error', error);
    return apiError('Failed to update loan');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    await db
      .delete(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'DELETE /api/loans/[id] error', error);
    return apiError('Failed to delete loan');
  }
}
