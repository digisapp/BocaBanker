import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { leads, clients, properties } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Map lead property type to client/property type
const mapPropertyType = (leadType: string) => {
  switch (leadType) {
    case 'industrial': return 'industrial';
    case 'retail': return 'retail';
    case 'multifamily': return 'multifamily';
    case 'mixed-use': return 'mixed-use';
    case 'hospitality': return 'hospitality';
    case 'healthcare': return 'healthcare';
    case 'office':
    case 'other':
    default:
      return 'commercial';
  }
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;

    // Fetch the lead
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id));

    if (!lead) {
      return apiError('Lead not found', 404);
    }

    if (lead.status === 'converted') {
      return apiError('Lead has already been converted', 400);
    }

    // Parse buyer name into first/last — prefer LLC member name if available
    const contactName = (lead.memberName || lead.buyerName || '').trim();
    const nameParts = contactName.split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
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

    // Create client from buyer info
    const [client] = await db
      .insert(clients)
      .values({
        userId: user.id,
        firstName,
        lastName,
        email: lead.buyerEmail || null,
        phone: lead.buyerPhone || null,
        company: lead.buyerCompany || null,
        address: lead.memberAddress || lead.propertyAddress,
        city: lead.memberCity || lead.propertyCity || null,
        state: lead.memberState || lead.propertyState || null,
        zip: lead.memberZip || lead.propertyZip || null,
        status: 'active',
        source: lead.source || 'lead-conversion',
        tags: lead.tags ?? [],
        notes: combinedNotes,
      })
      .returning();

    if (!client) {
      logger.error('leads-api', 'Failed to create client');
      return apiError('Failed to create client');
    }

    // Create property from property info
    let propertyId: string | undefined;
    try {
      const [property] = await db
        .insert(properties)
        .values({
          userId: user.id,
          clientId: client.id,
          address: lead.propertyAddress,
          city: lead.propertyCity || null,
          state: lead.propertyState || null,
          zip: lead.propertyZip || null,
          propertyType: mapPropertyType(lead.propertyType) as typeof properties.propertyType.enumValues[number],
          purchasePrice: lead.salePrice ?? '0',
          purchaseDate: lead.saleDate || null,
          buildingValue: lead.buildingValue || null,
          landValue: lead.landValue || null,
          squareFootage: lead.squareFootage || null,
          yearBuilt: lead.yearBuilt || null,
        })
        .returning();

      propertyId = property?.id;
    } catch (propError) {
      logger.error('leads-api', 'Failed to create property', propError);
    }

    // Update lead status to converted and link to client
    await db
      .update(leads)
      .set({
        status: 'converted',
        convertedClientId: client.id,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));

    return NextResponse.json({ clientId: client.id, propertyId });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'POST /api/leads/[id]/convert error', error);
    return apiError('Failed to convert lead');
  }
}
