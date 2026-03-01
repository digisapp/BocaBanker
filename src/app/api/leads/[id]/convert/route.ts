import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status === 'converted') {
      return NextResponse.json(
        { error: 'Lead has already been converted' },
        { status: 400 }
      );
    }

    // Parse buyer name into first/last — prefer LLC member name if available
    const contactName = (lead.member_name || lead.buyer_name || '').trim();
    const nameParts = contactName.split(/\s+/);
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';

    // Build notes with LLC/member info
    const notesParts: string[] = [];
    if (lead.notes) notesParts.push(lead.notes);
    if (lead.member_name) notesParts.push(`LLC Member: ${lead.member_name}`);
    if (lead.sunbiz_doc_number) notesParts.push(`Sunbiz Doc#: ${lead.sunbiz_doc_number}`);
    if (lead.seller_name) notesParts.push(`Seller: ${lead.seller_name}`);
    if (lead.parcel_id) notesParts.push(`Parcel ID: ${lead.parcel_id}`);
    if (lead.deed_book_page) notesParts.push(`Deed Book/Page: ${lead.deed_book_page}`);
    const combinedNotes = notesParts.length > 0 ? notesParts.join('\n') : null;

    // Create client from buyer info
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('clients')
      .insert({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: lead.buyer_email || null,
        phone: lead.buyer_phone || null,
        company: lead.buyer_company || null,
        address: lead.member_address || lead.property_address,
        city: lead.member_city || lead.property_city || null,
        state: lead.member_state || lead.property_state || null,
        zip: lead.member_zip || lead.property_zip || null,
        status: 'active',
        source: lead.source || 'lead-conversion',
        tags: lead.tags ?? [],
        notes: combinedNotes,
      })
      .select()
      .single();

    if (clientErr || !client) {
      logger.error('leads-api', 'Failed to create client', clientErr);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    // Create property from property info
    const { data: property, error: propErr } = await supabaseAdmin
      .from('properties')
      .insert({
        user_id: user.id,
        client_id: client.id,
        address: lead.property_address,
        city: lead.property_city || null,
        state: lead.property_state || null,
        zip: lead.property_zip || null,
        property_type: mapPropertyType(lead.property_type),
        purchase_price: lead.sale_price ?? '0',
        purchase_date: lead.sale_date || null,
        building_value: lead.building_value || null,
        land_value: lead.land_value || null,
        square_footage: lead.square_footage || null,
        year_built: lead.year_built || null,
      })
      .select()
      .single();

    if (propErr) {
      logger.error('leads-api', 'Failed to create property', propErr);
    }

    // Update lead status to converted and link to client
    await supabaseAdmin
      .from('leads')
      .update({
        status: 'converted',
        converted_client_id: client.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ clientId: client.id, propertyId: property?.id });
  } catch (error) {
    logger.error('leads-api', 'POST /api/leads/[id]/convert error', error);
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    );
  }
}
