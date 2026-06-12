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

    // Verify loan exists and belongs to user (full row needed for commission recompute)
    const [existing] = await db
      .select()
      .from(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)));

    if (!existing) {
      return apiError('Loan not found', 404);
    }

    // Partial update: only set fields present in the request body
    // (supports both snake_case and camelCase keys)
    const pick = (snake: string, camel: string) =>
      body[snake] !== undefined ? body[snake] : body[camel];
    const has = (snake: string, camel: string) =>
      body[snake] !== undefined || body[camel] !== undefined;

    const updateData: Partial<typeof loans.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (has('borrower_name', 'borrowerName')) updateData.borrowerName = pick('borrower_name', 'borrowerName');
    if (has('borrower_email', 'borrowerEmail')) updateData.borrowerEmail = pick('borrower_email', 'borrowerEmail');
    if (has('borrower_phone', 'borrowerPhone')) updateData.borrowerPhone = pick('borrower_phone', 'borrowerPhone');
    if (has('property_address', 'propertyAddress')) updateData.propertyAddress = pick('property_address', 'propertyAddress');
    if (has('property_city', 'propertyCity')) updateData.propertyCity = pick('property_city', 'propertyCity');
    if (has('property_state', 'propertyState')) updateData.propertyState = pick('property_state', 'propertyState');
    if (has('property_zip', 'propertyZip')) updateData.propertyZip = pick('property_zip', 'propertyZip');
    if (has('purchase_price', 'purchasePrice')) updateData.purchasePrice = pick('purchase_price', 'purchasePrice');
    if (has('loan_amount', 'loanAmount')) updateData.loanAmount = pick('loan_amount', 'loanAmount');
    if (has('loan_type', 'loanType')) updateData.loanType = pick('loan_type', 'loanType');
    if (has('interest_rate', 'interestRate')) updateData.interestRate = pick('interest_rate', 'interestRate');
    if (body.term !== undefined) updateData.term = body.term;
    if (body.status !== undefined) updateData.status = body.status;
    if (has('arive_link', 'ariveLink')) updateData.ariveLink = pick('arive_link', 'ariveLink');
    if (has('estimated_closing_date', 'estimatedClosingDate')) updateData.estimatedClosingDate = pick('estimated_closing_date', 'estimatedClosingDate');
    if (has('actual_closing_date', 'actualClosingDate')) updateData.actualClosingDate = pick('actual_closing_date', 'actualClosingDate');
    if (has('commission_bps', 'commissionBps')) updateData.commissionBps = pick('commission_bps', 'commissionBps');
    if (has('lender_name', 'lenderName')) updateData.lenderName = pick('lender_name', 'lenderName');
    if (has('lead_id', 'leadId')) updateData.leadId = pick('lead_id', 'leadId');
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Recompute commission only when loanAmount or commissionBps is being
    // updated, merging new values with the existing row. Never null implicitly.
    if (has('loan_amount', 'loanAmount') || has('commission_bps', 'commissionBps')) {
      const effectiveLoanAmount = parseFloat(
        String(
          has('loan_amount', 'loanAmount')
            ? pick('loan_amount', 'loanAmount')
            : existing.loanAmount ?? '0'
        )
      );
      const effectiveBps = has('commission_bps', 'commissionBps')
        ? pick('commission_bps', 'commissionBps')
        : existing.commissionBps;

      if (effectiveBps != null && effectiveLoanAmount > 0) {
        updateData.commissionAmount = ((effectiveLoanAmount * effectiveBps) / 10000).toFixed(2);
      }
    }

    const [updated] = await db
      .update(loans)
      .set(updateData)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)))
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

    const deleted = await db
      .delete(loans)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)))
      .returning({ id: loans.id });

    if (deleted.length === 0) {
      return apiError('Loan not found', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'DELETE /api/loans/[id] error', error);
    return apiError('Failed to delete loan');
  }
}
