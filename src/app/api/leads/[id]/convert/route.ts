import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { requireUuid } from '@/lib/api/params';
import { db } from '@/db';
import { leads, clients, properties } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { realValue } from '@/lib/leads';
import { PROPERTY_PROPERTY_TYPES, type PropertyPropertyType } from '@/constants/property-types';

// Every lead type is also a property type ('office' and 'other' included), so
// keep it as-is rather than flattening office/other into 'commercial'. The
// study form already maps office/other to commercial for cost-seg allocation.
const mapPropertyType = (leadType: string): PropertyPropertyType =>
  (PROPERTY_PROPERTY_TYPES as readonly string[]).includes(leadType)
    ? (leadType as PropertyPropertyType)
    : 'other';

// Sentinel error used to roll back the transaction on a concurrent convert
class AlreadyConvertedError extends Error {}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const id = requireUuid((await params).id, 'Lead not found');

    // Fetch the lead — scoped to the authenticated user
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!lead) {
      return apiError('Lead not found', 404);
    }

    // convertedClientId also covers a converted lead whose status was later
    // edited (older data) — converting again would duplicate the client.
    if (lead.status === 'converted' || lead.convertedClientId) {
      return apiError('Lead has already been converted', 400);
    }

    // Chat/phone leads carry placeholders ("Not provided", "Unknown yet") —
    // never copy those onto the client or property.
    const propertyAddress = realValue(lead.propertyAddress);

    // Parse buyer name into first/last — prefer LLC member name if available.
    // first/last are NOT NULL; with no usable name fall back to the company,
    // then 'Unknown' (the client form requires both names).
    const contactName = realValue(lead.memberName) ?? realValue(lead.buyerName);
    const nameParts = contactName ? contactName.split(/\s+/) : [];
    const firstName = nameParts[0] ?? realValue(lead.buyerCompany) ?? 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    // Build notes with LLC/member info
    const notesParts: string[] = [];
    if (lead.notes) notesParts.push(lead.notes);
    if (lead.memberName) notesParts.push(`LLC Member: ${lead.memberName}`);
    if (lead.sunbizDocNumber) notesParts.push(`Sunbiz Doc#: ${lead.sunbizDocNumber}`);
    if (lead.sellerName) notesParts.push(`Seller: ${lead.sellerName}`);
    if (lead.parcelId) notesParts.push(`Parcel ID: ${lead.parcelId}`);
    if (lead.deedBookPage) notesParts.push(`Deed Book/Page: ${lead.deedBookPage}`);
    const combinedNotes = notesParts.length > 0 ? notesParts.join('\n') : null;

    // Create client + property and flip lead status atomically
    const { clientId, propertyId } = await db.transaction(async (tx) => {
      // Create client from buyer info
      const [client] = await tx
        .insert(clients)
        .values({
          userId: user.id,
          firstName,
          lastName,
          email: realValue(lead.buyerEmail),
          phone: realValue(lead.buyerPhone),
          company: realValue(lead.buyerCompany),
          address: realValue(lead.memberAddress) ?? propertyAddress,
          city: realValue(lead.memberCity) ?? realValue(lead.propertyCity),
          state: realValue(lead.memberState) ?? realValue(lead.propertyState),
          zip: realValue(lead.memberZip) ?? realValue(lead.propertyZip),
          status: 'active',
          source: lead.source || 'lead-conversion',
          tags: lead.tags ?? [],
          notes: combinedNotes,
        })
        .returning();

      // Create a property only when the lead names one — a chat/phone lead
      // with address "Not provided" would otherwise become a junk "$0
      // commercial at Not provided" record. purchase_price is NOT NULL, so an
      // unknown sale price is stored as 0 (the property edit form accepts 0).
      const [property] = propertyAddress
        ? await tx
            .insert(properties)
            .values({
              userId: user.id,
              clientId: client.id,
              address: propertyAddress,
              city: realValue(lead.propertyCity),
              state: realValue(lead.propertyState),
              zip: realValue(lead.propertyZip),
              propertyType: mapPropertyType(lead.propertyType),
              purchasePrice: lead.salePrice ?? '0',
              purchaseDate: lead.saleDate || null,
              buildingValue: lead.buildingValue || null,
              landValue: lead.landValue || null,
              squareFootage: lead.squareFootage || null,
              yearBuilt: lead.yearBuilt || null,
            })
            .returning()
        : [];

      // Update lead status to converted and link to client — conditional on
      // the lead not already being converted, so concurrent converts can't
      // double-create. Scoped to the authenticated user.
      const flipped = await tx
        .update(leads)
        .set({
          status: 'converted',
          convertedClientId: client.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(leads.id, id),
            eq(leads.userId, user.id),
            // IS DISTINCT FROM: status is nullable and `<>` never matches NULL
            sql`${leads.status} IS DISTINCT FROM 'converted'`,
            isNull(leads.convertedClientId)
          )
        )
        .returning({ id: leads.id });

      if (flipped.length === 0) {
        // Roll back the client/property inserts
        throw new AlreadyConvertedError('Lead has already been converted');
      }

      return { clientId: client.id, propertyId: property?.id };
    });

    return NextResponse.json({ clientId, propertyId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    if (error instanceof AlreadyConvertedError) {
      return apiError('Lead has already been converted', 409);
    }
    logger.error('leads-api', 'POST /api/leads/[id]/convert error', error);
    return apiError('Failed to convert lead');
  }
}
