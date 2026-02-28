import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';
import { leadSchema } from '@/lib/validation/schemas';

// Map camelCase sort keys to snake_case DB columns
const SORT_COLUMNS: Record<string, string> = {
  propertyAddress: 'property_address',
  buyerName: 'buyer_name',
  salePrice: 'sale_price',
  saleDate: 'sale_date',
  status: 'status',
  priority: 'priority',
  propertyType: 'property_type',
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
    const sortColumn = SORT_COLUMNS[sort] || 'created_at';
    const ascending = order === 'asc';

    // Use Supabase REST API (HTTP) instead of postgres-js to avoid serverless connection issues
    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(
        `property_address.ilike.%${search}%,buyer_name.ilike.%${search}%,buyer_company.ilike.%${search}%,property_city.ilike.%${search}%,property_county.ilike.%${search}%`
      );
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (propertyType && propertyType !== 'all') {
      query = query.eq('property_type', propertyType);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    if (minPrice) {
      query = query.gte('sale_price', minPrice);
    }

    if (maxPrice) {
      query = query.lte('sale_price', maxPrice);
    }

    if (dateFrom) {
      query = query.gte('sale_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('sale_date', dateTo);
    }

    if (member) {
      query = query.eq('member_name', member);
    }

    query = query
      .order(sortColumn, { ascending })
      .range(offset, offset + limit - 1);

    const { data: rows, count: total, error } = await query;

    if (error) {
      logger.error('leads-api', 'Supabase query error', error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Map snake_case DB rows to camelCase for frontend
    const leadRows = (rows || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.user_id,
      propertyAddress: r.property_address,
      propertyCity: r.property_city,
      propertyCounty: r.property_county,
      propertyState: r.property_state,
      propertyZip: r.property_zip,
      propertyType: r.property_type,
      salePrice: r.sale_price,
      saleDate: r.sale_date,
      parcelId: r.parcel_id,
      buyerName: r.buyer_name,
      buyerCompany: r.buyer_company,
      buyerEmail: r.buyer_email,
      buyerPhone: r.buyer_phone,
      sellerName: r.seller_name,
      memberName: r.member_name,
      memberAddress: r.member_address,
      memberCity: r.member_city,
      memberState: r.member_state,
      memberZip: r.member_zip,
      sunbizDocNumber: r.sunbiz_doc_number,
      squareFootage: r.square_footage,
      yearBuilt: r.year_built,
      status: r.status,
      priority: r.priority,
      source: r.source,
      notes: r.notes,
      tags: r.tags,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({
      leads: leadRows,
      total: total ?? 0,
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
