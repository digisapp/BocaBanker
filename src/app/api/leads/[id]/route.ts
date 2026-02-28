import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { leadSchema } from '@/lib/validation/schemas';

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

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
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
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const data = parsed.data;

    const tagsArray = data.tags
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const [updated] = await db
      .update(leads)
      .set({
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
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
      .returning();

    return NextResponse.json(updated);
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

    // Verify ownership
    const [existing] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Hard delete
    await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('leads-api', 'DELETE /api/leads/[id] error', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
