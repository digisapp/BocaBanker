import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';

interface ImportBody {
  leads: Record<string, string>[];
  mapping: Record<string, string>;
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

    const body: ImportBody = await request.json();

    if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
      return NextResponse.json(
        { error: 'No lead data provided' },
        { status: 400 }
      );
    }

    const errors: { row: number; message: string }[] = [];
    const validRows: (typeof leads.$inferInsert)[] = [];

    body.leads.forEach((row, index) => {
      const propertyAddress = (row.property_address ?? '').trim();

      if (!propertyAddress) {
        errors.push({
          row: index + 1,
          message: 'Missing required field: property_address',
        });
        return;
      }

      // Validate property type if provided
      const rawPropertyType = (row.property_type ?? '').trim().toLowerCase();
      const validPropertyTypes = [
        'industrial', 'office', 'retail', 'multifamily',
        'mixed-use', 'hospitality', 'healthcare', 'other',
      ];
      const propertyType = validPropertyTypes.includes(rawPropertyType)
        ? (rawPropertyType as 'industrial' | 'office' | 'retail' | 'multifamily' | 'mixed-use' | 'hospitality' | 'healthcare' | 'other')
        : 'other';

      // Validate email format if provided
      const buyerEmail = (row.buyer_email ?? '').trim();
      if (buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
        errors.push({
          row: index + 1,
          message: `Invalid email format: ${buyerEmail}`,
        });
        return;
      }

      // Validate status if provided
      const rawStatus = (row.status ?? '').trim().toLowerCase();
      const validStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];
      const status = validStatuses.includes(rawStatus)
        ? (rawStatus as 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'converted' | 'lost')
        : 'new';

      // Validate priority if provided
      const rawPriority = (row.priority ?? '').trim().toLowerCase();
      const validPriorities = ['low', 'medium', 'high'];
      const priority = validPriorities.includes(rawPriority)
        ? (rawPriority as 'low' | 'medium' | 'high')
        : 'medium';

      // Parse tags (comma-separated string)
      const tagsRaw = (row.tags ?? '').trim();
      const tags = tagsRaw
        ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      // Parse numeric fields
      const salePrice = (row.sale_price ?? '').trim();
      const squareFootageRaw = (row.square_footage ?? '').trim();
      const squareFootage = squareFootageRaw ? parseInt(squareFootageRaw, 10) : null;
      const yearBuiltRaw = (row.year_built ?? '').trim();
      const yearBuilt = yearBuiltRaw ? parseInt(yearBuiltRaw, 10) : null;
      const buildingValue = (row.building_value ?? '').trim();
      const landValue = (row.land_value ?? '').trim();

      validRows.push({
        userId: user.id,
        propertyAddress,
        propertyCity: (row.property_city ?? '').trim() || null,
        propertyCounty: (row.property_county ?? '').trim() || null,
        propertyState: (row.property_state ?? '').trim() || 'FL',
        propertyZip: (row.property_zip ?? '').trim() || null,
        propertyType,
        salePrice: salePrice || null,
        saleDate: (row.sale_date ?? '').trim() || null,
        parcelId: (row.parcel_id ?? '').trim() || null,
        deedBookPage: (row.deed_book_page ?? '').trim() || null,
        buyerName: (row.buyer_name ?? '').trim() || null,
        buyerCompany: (row.buyer_company ?? '').trim() || null,
        buyerEmail: buyerEmail || null,
        buyerPhone: (row.buyer_phone ?? '').trim() || null,
        sellerName: (row.seller_name ?? '').trim() || null,
        squareFootage: squareFootage && !isNaN(squareFootage) ? squareFootage : null,
        yearBuilt: yearBuilt && !isNaN(yearBuilt) ? yearBuilt : null,
        buildingValue: buildingValue || null,
        landValue: landValue || null,
        status,
        priority,
        source: (row.source ?? '').trim() || null,
        notes: (row.notes ?? '').trim() || null,
        tags,
      });
    });

    let imported = 0;

    if (validRows.length > 0) {
      // Batch insert in chunks of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        await db.insert(leads).values(batch);
        imported += batch.length;
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    logger.error('leads-api', 'POST /api/leads/import error', error);
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    );
  }
}
