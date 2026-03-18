import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { loans } from '@/db/schema';
import { eq, and, ilike, or, desc, asc, count } from 'drizzle-orm';
import { loanSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '10')));
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const loanType = searchParams.get('loanType') ?? '';
    const sort = searchParams.get('sort') ?? 'createdAt';
    const order = searchParams.get('order') ?? 'desc';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(loans.userId, user.id)];

    if (search) {
      conditions.push(
        or(
          ilike(loans.borrowerName, `%${search}%`),
          ilike(loans.propertyAddress, `%${search}%`),
          ilike(loans.borrowerEmail, `%${search}%`),
          ilike(loans.lenderName, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(loans.status, status as typeof loans.status.enumValues[number]));
    }

    if (loanType && loanType !== 'all') {
      conditions.push(eq(loans.loanType, loanType as typeof loans.loanType.enumValues[number]));
    }

    const whereClause = and(...conditions);

    // Determine sort column
    const getSortColumn = (key: string) => {
      switch (key) {
        case 'borrowerName': return loans.borrowerName;
        case 'propertyAddress': return loans.propertyAddress;
        case 'loanAmount': return loans.loanAmount;
        case 'loanType': return loans.loanType;
        case 'status': return loans.status;
        case 'interestRate': return loans.interestRate;
        case 'estimatedClosingDate': return loans.estimatedClosingDate;
        default: return loans.createdAt;
      }
    };

    const sortColumn = getSortColumn(sort);
    const orderFn = order === 'asc' ? asc : desc;

    // Query loans and total count
    const [loanRows, totalResult] = await Promise.all([
      db
        .select()
        .from(loans)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(loans)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return NextResponse.json({
      loans: loanRows,
      total,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'GET /api/loans error', error);
    return apiError('Failed to fetch loans');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const parsed = loanSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400);
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
    if (error instanceof ApiError) return error.response;
    logger.error('loans-api', 'POST /api/loans error', error);
    return apiError('Failed to create loan');
  }
}
