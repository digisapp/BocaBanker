import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!lead) {
      return apiError('Lead not found', 404);
    }

    return NextResponse.json(lead);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'GET /api/leads/[id] error', error);
    return apiError('Failed to fetch lead');
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

    // Verify lead exists and belongs to the authenticated user
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!existing) {
      return apiError('Lead not found', 404);
    }

    // Partial update: only set fields present in the request body
    // (supports both snake_case and camelCase keys)
    const pick = (snake: string, camel: string) =>
      body[snake] !== undefined ? body[snake] : body[camel];
    const has = (snake: string, camel: string) =>
      body[snake] !== undefined || body[camel] !== undefined;

    const updateData: Partial<typeof leads.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (has('property_address', 'propertyAddress')) updateData.propertyAddress = pick('property_address', 'propertyAddress');
    if (has('property_city', 'propertyCity')) updateData.propertyCity = pick('property_city', 'propertyCity');
    if (has('property_county', 'propertyCounty')) updateData.propertyCounty = pick('property_county', 'propertyCounty');
    if (has('property_state', 'propertyState')) updateData.propertyState = pick('property_state', 'propertyState');
    if (has('property_zip', 'propertyZip')) updateData.propertyZip = pick('property_zip', 'propertyZip');
    if (has('property_type', 'propertyType')) updateData.propertyType = pick('property_type', 'propertyType');
    if (has('sale_price', 'salePrice')) updateData.salePrice = pick('sale_price', 'salePrice');
    if (has('sale_date', 'saleDate')) updateData.saleDate = pick('sale_date', 'saleDate');
    if (has('parcel_id', 'parcelId')) updateData.parcelId = pick('parcel_id', 'parcelId');
    if (has('buyer_name', 'buyerName')) updateData.buyerName = pick('buyer_name', 'buyerName');
    if (has('buyer_company', 'buyerCompany')) updateData.buyerCompany = pick('buyer_company', 'buyerCompany');
    if (has('buyer_email', 'buyerEmail')) updateData.buyerEmail = pick('buyer_email', 'buyerEmail');
    if (has('buyer_phone', 'buyerPhone')) updateData.buyerPhone = pick('buyer_phone', 'buyerPhone');
    if (has('seller_name', 'sellerName')) updateData.sellerName = pick('seller_name', 'sellerName');
    if (has('square_footage', 'squareFootage')) updateData.squareFootage = pick('square_footage', 'squareFootage');
    if (has('year_built', 'yearBuilt')) updateData.yearBuilt = pick('year_built', 'yearBuilt');
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.tags !== undefined) {
      updateData.tags = body.tags
        ? (typeof body.tags === 'string'
            ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : body.tags)
        : [];
    }

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
      .returning();

    if (!updated) {
      return apiError('Failed to update lead');
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'PUT /api/leads/[id] error', error);
    return apiError('Failed to update lead');
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
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
      .returning({ id: leads.id });

    if (deleted.length === 0) {
      return apiError('Lead not found', 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'DELETE /api/leads/[id] error', error);
    return apiError('Failed to delete lead');
  }
}
