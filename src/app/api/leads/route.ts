import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';
import { eq, and, or, ilike, desc, asc, count, gte, lte } from 'drizzle-orm';
import { leadSchema } from '@/lib/validation/schemas';

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
    const propertyType = searchParams.get('propertyType') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const minPrice = searchParams.get('minPrice') ?? '';
    const maxPrice = searchParams.get('maxPrice') ?? '';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';
    const sort = searchParams.get('sort') ?? 'createdAt';
    const order = searchParams.get('order') ?? 'desc';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(leads.userId, user.id)];

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
      conditions.push(
        eq(leads.status, status as 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'converted' | 'lost')
      );
    }

    if (propertyType && propertyType !== 'all') {
      conditions.push(
        eq(leads.propertyType, propertyType as 'industrial' | 'office' | 'retail' | 'multifamily' | 'mixed-use' | 'hospitality' | 'healthcare' | 'other')
      );
    }

    if (priority && priority !== 'all') {
      conditions.push(
        eq(leads.priority, priority as 'low' | 'medium' | 'high')
      );
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

    const whereClause = and(...conditions);

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

    // Query leads
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
    logger.error('leads-api', 'GET /api/leads error', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
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
    logger.error('leads-api', 'POST /api/leads error', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
