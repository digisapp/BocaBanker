import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// Map snake_case DB row to camelCase for frontend
function mapLead(r: Record<string, unknown>) {
  return {
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
    squareFootage: r.square_footage,
    yearBuilt: r.year_built,
    status: r.status,
    priority: r.priority,
    source: r.source,
    notes: r.notes,
    tags: r.tags,
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

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(mapLead(lead));
  } catch (error) {
    logger.error('leads-api', 'GET /api/leads/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
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

    // Verify lead exists
    const { data: existing } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const tagsArray = body.tags
      ? (typeof body.tags === 'string'
          ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : body.tags)
      : [];

    const { data: updated, error } = await supabaseAdmin
      .from('leads')
      .update({
        property_address: body.property_address ?? body.propertyAddress,
        property_city: body.property_city ?? body.propertyCity ?? null,
        property_county: body.property_county ?? body.propertyCounty ?? null,
        property_state: body.property_state ?? body.propertyState ?? 'FL',
        property_zip: body.property_zip ?? body.propertyZip ?? null,
        property_type: body.property_type ?? body.propertyType,
        sale_price: body.sale_price ?? body.salePrice ?? null,
        sale_date: body.sale_date ?? body.saleDate ?? null,
        parcel_id: body.parcel_id ?? body.parcelId ?? null,
        buyer_name: body.buyer_name ?? body.buyerName ?? null,
        buyer_company: body.buyer_company ?? body.buyerCompany ?? null,
        buyer_email: body.buyer_email ?? body.buyerEmail ?? null,
        buyer_phone: body.buyer_phone ?? body.buyerPhone ?? null,
        seller_name: body.seller_name ?? body.sellerName ?? null,
        square_footage: body.square_footage ?? body.squareFootage ?? null,
        year_built: body.year_built ?? body.yearBuilt ?? null,
        status: body.status,
        priority: body.priority,
        source: body.source ?? null,
        notes: body.notes ?? null,
        tags: tagsArray,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('leads-api', 'Supabase update error', error);
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    return NextResponse.json(mapLead(updated));
  } catch (error) {
    logger.error('leads-api', 'PUT /api/leads/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
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
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('leads-api', 'Supabase delete error', error);
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('leads-api', 'DELETE /api/leads/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
