import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads, clients, properties } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
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

    // Fetch the lead with ownership check
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status === 'converted') {
      return NextResponse.json(
        { error: 'Lead has already been converted' },
        { status: 400 }
      );
    }

    // Map lead property type to properties property type
    // Lead types: industrial, office, retail, multifamily, mixed-use, hospitality, healthcare, other
    // Property types: commercial, residential, mixed-use, industrial, retail, hospitality, healthcare, multifamily
    const mapPropertyType = (
      leadType: string
    ): 'commercial' | 'residential' | 'mixed-use' | 'industrial' | 'retail' | 'hospitality' | 'healthcare' | 'multifamily' => {
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

    // Parse buyer name into first/last
    const buyerName = (lead.buyerName ?? '').trim();
    const nameParts = buyerName.split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

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
        address: lead.propertyAddress,
        city: lead.propertyCity || null,
        state: lead.propertyState || null,
        zip: lead.propertyZip || null,
        status: 'active',
        source: lead.source || 'lead-conversion',
        tags: lead.tags ?? [],
        notes: lead.notes || null,
      })
      .returning();

    // Create property from property info
    const [property] = await db
      .insert(properties)
      .values({
        userId: user.id,
        clientId: client.id,
        address: lead.propertyAddress,
        city: lead.propertyCity || null,
        state: lead.propertyState || null,
        zip: lead.propertyZip || null,
        propertyType: mapPropertyType(lead.propertyType),
        purchasePrice: lead.salePrice ?? '0',
        purchaseDate: lead.saleDate || null,
        buildingValue: lead.buildingValue || null,
        landValue: lead.landValue || null,
        squareFootage: lead.squareFootage || null,
        yearBuilt: lead.yearBuilt || null,
      })
      .returning();

    // Update lead status to converted
    await db
      .update(leads)
      .set({
        status: 'converted',
        convertedClientId: client.id,
        updatedAt: new Date(),
      })
      .where(and(eq(leads.id, id), eq(leads.userId, user.id)));

    return NextResponse.json({ client, property });
  } catch (error) {
    logger.error('leads-api', 'POST /api/leads/[id]/convert error', error);
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    );
  }
}
