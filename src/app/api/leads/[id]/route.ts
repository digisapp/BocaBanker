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

    const tagsArray = body.tags
      ? (typeof body.tags === 'string'
          ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : body.tags)
      : [];

    const [updated] = await db
      .update(leads)
      .set({
        propertyAddress: body.property_address ?? body.propertyAddress,
        propertyCity: body.property_city ?? body.propertyCity ?? null,
        propertyCounty: body.property_county ?? body.propertyCounty ?? null,
        propertyState: body.property_state ?? body.propertyState ?? 'FL',
        propertyZip: body.property_zip ?? body.propertyZip ?? null,
        propertyType: body.property_type ?? body.propertyType,
        salePrice: body.sale_price ?? body.salePrice ?? null,
        saleDate: body.sale_date ?? body.saleDate ?? null,
        parcelId: body.parcel_id ?? body.parcelId ?? null,
        buyerName: body.buyer_name ?? body.buyerName ?? null,
        buyerCompany: body.buyer_company ?? body.buyerCompany ?? null,
        buyerEmail: body.buyer_email ?? body.buyerEmail ?? null,
        buyerPhone: body.buyer_phone ?? body.buyerPhone ?? null,
        sellerName: body.seller_name ?? body.sellerName ?? null,
        squareFootage: body.square_footage ?? body.squareFootage ?? null,
        yearBuilt: body.year_built ?? body.yearBuilt ?? null,
        status: body.status,
        priority: body.priority,
        source: body.source ?? null,
        notes: body.notes ?? null,
        tags: tagsArray,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
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

    await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'DELETE /api/leads/[id] error', error);
    return apiError('Failed to delete lead');
  }
}
