import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError, apiValidationError } from '@/lib/api/response';
import { requireUuid } from '@/lib/api/params';
import { loanUpdateSchema } from '@/lib/validation/update-schemas';
import { db } from '@/db';
import { loans, leads } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const id = requireUuid((await params).id, 'Loan not found');

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

    const id = requireUuid((await params).id, 'Loan not found');
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
    // (supports both snake_case and camelCase keys). Normalize to snake_case,
    // then validate so bad enums/numerics are a 400 rather than a DB 500.
    const FIELDS: [string, string][] = [
      ['borrower_name', 'borrowerName'],
      ['borrower_email', 'borrowerEmail'],
      ['borrower_phone', 'borrowerPhone'],
      ['property_address', 'propertyAddress'],
      ['property_city', 'propertyCity'],
      ['property_state', 'propertyState'],
      ['property_zip', 'propertyZip'],
      ['purchase_price', 'purchasePrice'],
      ['loan_amount', 'loanAmount'],
      ['loan_type', 'loanType'],
      ['interest_rate', 'interestRate'],
      ['term', 'term'],
      ['status', 'status'],
      ['arive_link', 'ariveLink'],
      ['estimated_closing_date', 'estimatedClosingDate'],
      ['actual_closing_date', 'actualClosingDate'],
      ['commission_bps', 'commissionBps'],
      ['lender_name', 'lenderName'],
      ['lead_id', 'leadId'],
      ['notes', 'notes'],
    ];
    const normalized: Record<string, unknown> = {};
    if (body && typeof body === 'object') {
      for (const [snake, camel] of FIELDS) {
        if (body[snake] !== undefined) normalized[snake] = body[snake];
        else if (body[camel] !== undefined) normalized[snake] = body[camel];
      }
    }

    const parsed = loanUpdateSchema.safeParse(normalized);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }
    const d = parsed.data;
    const has = (k: keyof typeof d) => k in normalized;

    // A linked lead must belong to the same user
    if (d.lead_id) {
      const [ownedLead] = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.id, d.lead_id), eq(leads.userId, user.id)))
        .limit(1);
      if (!ownedLead) {
        return apiError('Lead not found', 400);
      }
    }

    const updateData: Partial<typeof loans.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (has('borrower_name')) updateData.borrowerName = d.borrower_name;
    if (has('borrower_email')) updateData.borrowerEmail = d.borrower_email;
    if (has('borrower_phone')) updateData.borrowerPhone = d.borrower_phone;
    if (has('property_address')) updateData.propertyAddress = d.property_address;
    if (has('property_city')) updateData.propertyCity = d.property_city;
    if (has('property_state')) updateData.propertyState = d.property_state;
    if (has('property_zip')) updateData.propertyZip = d.property_zip;
    if (has('purchase_price')) updateData.purchasePrice = d.purchase_price;
    if (has('loan_amount')) updateData.loanAmount = d.loan_amount;
    if (has('loan_type')) updateData.loanType = d.loan_type;
    if (has('interest_rate')) updateData.interestRate = d.interest_rate;
    if (has('term')) updateData.term = d.term;
    if (has('status')) updateData.status = d.status;
    if (has('arive_link')) updateData.ariveLink = d.arive_link;
    if (has('estimated_closing_date')) updateData.estimatedClosingDate = d.estimated_closing_date;
    if (has('actual_closing_date')) updateData.actualClosingDate = d.actual_closing_date;
    if (has('commission_bps')) updateData.commissionBps = d.commission_bps;
    if (has('lender_name')) updateData.lenderName = d.lender_name;
    if (has('lead_id')) updateData.leadId = d.lead_id;
    if (has('notes')) updateData.notes = d.notes;

    // Recompute commission only when loanAmount or commissionBps is being
    // updated, merging new values with the existing row.
    if (has('loan_amount') || has('commission_bps')) {
      const effectiveLoanAmount = parseFloat(
        has('loan_amount') ? String(d.loan_amount) : existing.loanAmount ?? '0'
      );
      const effectiveBps = has('commission_bps') ? d.commission_bps : existing.commissionBps;

      if (effectiveBps == null) {
        // bps explicitly cleared — a stale amount would keep counting toward
        // commission MTD/YTD stats
        if (has('commission_bps')) updateData.commissionAmount = null;
      } else if (effectiveLoanAmount > 0) {
        updateData.commissionAmount = ((effectiveLoanAmount * effectiveBps) / 10000).toFixed(2);
      }
    }

    const [updated] = await db
      .update(loans)
      .set(updateData)
      .where(and(eq(loans.id, id), eq(loans.userId, user.id)))
      .returning();

    if (!updated) {
      return apiError('Loan not found', 404);
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

    const id = requireUuid((await params).id, 'Loan not found');

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
