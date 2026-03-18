import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';
import { eq, and, ilike, or, gte, lte, desc, asc, count } from 'drizzle-orm';
import { leadSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '10')));
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const propertyType = searchParams.get('propertyType') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const minPrice = searchParams.get('minPrice') ?? '';
    const maxPrice = searchParams.get('maxPrice') ?? '';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    const member = searchParams.get('member') ?? '';
    const sort = searchParams.get('sort') ?? 'createdAt';
    const order = searchParams.get('order') ?? 'desc';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(leads.propertyAddress, `%${search}%`),
          ilike(leads.buyerName, `%${search}%`),
          ilike(leads.buyerCompany, `%${search}%`),
          ilike(leads.propertyCity, `%${search}%`),
          ilike(leads.propertyCounty, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(leads.status, status as typeof leads.status.enumValues[number]));
    }

    if (propertyType && propertyType !== 'all') {
      conditions.push(eq(leads.propertyType, propertyType as typeof leads.propertyType.enumValues[number]));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(leads.priority, priority as typeof leads.priority.enumValues[number]));
    }

    if (minPrice) {
      conditions.push(gte(leads.salePrice, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(leads.salePrice, maxPrice));
    }

    if (dateFrom) {
      conditions.push(gte(leads.saleDate, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(leads.saleDate, dateTo));
    }

    if (member) {
      conditions.push(eq(leads.memberName, member));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort column
    const getSortColumn = (key: string) => {
      switch (key) {
        case 'propertyAddress': return leads.propertyAddress;
        case 'buyerName': return leads.buyerName;
        case 'salePrice': return leads.salePrice;
        case 'saleDate': return leads.saleDate;
        case 'status': return leads.status;
        case 'priority': return leads.priority;
        case 'propertyType': return leads.propertyType;
        default: return leads.createdAt;
      }
    };

    const sortColumn = getSortColumn(sort);
    const orderFn = order === 'asc' ? asc : desc;

    // Query leads and total count
    const [leadRows, totalResult] = await Promise.all([
      db
        .select()
        .from(leads)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(leads)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return NextResponse.json({
      leads: leadRows,
      total,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'GET /api/leads error', error);
    return apiError('Failed to fetch leads');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Convert comma-separated tags string to array
    const tagsArray = data.tags
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const [created] = await db
      .insert(leads)
      .values({
        userId: user.id,
        propertyAddress: data.property_address,
        propertyCity: data.property_city || null,
        propertyCounty: data.property_county || null,
        propertyState: data.property_state || 'FL',
        propertyZip: data.property_zip || null,
        propertyType: data.property_type,
        salePrice: data.sale_price?.toString() ?? null,
        saleDate: data.sale_date || null,
        parcelId: data.parcel_id || null,
        buyerName: data.buyer_name || null,
        buyerCompany: data.buyer_company || null,
        buyerEmail: data.buyer_email || null,
        buyerPhone: data.buyer_phone || null,
        sellerName: data.seller_name || null,
        squareFootage: data.square_footage ?? null,
        yearBuilt: data.year_built ?? null,
        status: data.status,
        priority: data.priority,
        source: data.source || null,
        notes: data.notes || null,
        tags: tagsArray,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'POST /api/leads error', error);
    return apiError('Failed to create lead');
  }
}
