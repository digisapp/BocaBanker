import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError, apiValidationError } from '@/lib/api/response';
import { requireUuid } from '@/lib/api/params';
import { leadUpdateSchema } from '@/lib/validation/update-schemas';
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

    const id = requireUuid((await params).id, 'Lead not found');

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

    const id = requireUuid((await params).id, 'Lead not found');
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
    // (supports both snake_case and camelCase keys). Normalize to snake_case,
    // then validate so bad enums/numerics are a 400 rather than a DB 500.
    const FIELDS: [string, string][] = [
      ['property_address', 'propertyAddress'],
      ['property_city', 'propertyCity'],
      ['property_county', 'propertyCounty'],
      ['property_state', 'propertyState'],
      ['property_zip', 'propertyZip'],
      ['property_type', 'propertyType'],
      ['sale_price', 'salePrice'],
      ['sale_date', 'saleDate'],
      ['parcel_id', 'parcelId'],
      ['buyer_name', 'buyerName'],
      ['buyer_company', 'buyerCompany'],
      ['buyer_email', 'buyerEmail'],
      ['buyer_phone', 'buyerPhone'],
      ['seller_name', 'sellerName'],
      ['square_footage', 'squareFootage'],
      ['year_built', 'yearBuilt'],
      ['status', 'status'],
      ['priority', 'priority'],
      ['source', 'source'],
      ['notes', 'notes'],
      ['tags', 'tags'],
    ];
    const normalized: Record<string, unknown> = {};
    if (body && typeof body === 'object') {
      for (const [snake, camel] of FIELDS) {
        if (body[snake] !== undefined) normalized[snake] = body[snake];
        else if (body[camel] !== undefined) normalized[snake] = body[camel];
      }
    }

    const parsed = leadUpdateSchema.safeParse(normalized);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }
    const d = parsed.data;
    const has = (k: keyof typeof d) => k in normalized;

    const updateData: Partial<typeof leads.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (has('property_address')) updateData.propertyAddress = d.property_address;
    if (has('property_city')) updateData.propertyCity = d.property_city;
    if (has('property_county')) updateData.propertyCounty = d.property_county;
    if (has('property_state')) updateData.propertyState = d.property_state;
    if (has('property_zip')) updateData.propertyZip = d.property_zip;
    if (has('property_type')) updateData.propertyType = d.property_type;
    if (has('sale_price')) updateData.salePrice = d.sale_price;
    if (has('sale_date')) updateData.saleDate = d.sale_date;
    if (has('parcel_id')) updateData.parcelId = d.parcel_id;
    if (has('buyer_name')) updateData.buyerName = d.buyer_name;
    if (has('buyer_company')) updateData.buyerCompany = d.buyer_company;
    if (has('buyer_email')) updateData.buyerEmail = d.buyer_email;
    if (has('buyer_phone')) updateData.buyerPhone = d.buyer_phone;
    if (has('seller_name')) updateData.sellerName = d.seller_name;
    if (has('square_footage')) updateData.squareFootage = d.square_footage;
    if (has('year_built')) updateData.yearBuilt = d.year_built;
    if (has('status')) updateData.status = d.status;
    if (has('priority')) updateData.priority = d.priority;
    if (has('source')) updateData.source = d.source;
    if (has('notes')) updateData.notes = d.notes;
    if (has('tags')) updateData.tags = d.tags;

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)))
      .returning();

    if (!updated) {
      return apiError('Lead not found', 404);
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

    const id = requireUuid((await params).id, 'Lead not found');

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
