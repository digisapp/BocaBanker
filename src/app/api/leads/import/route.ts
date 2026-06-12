import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';
import { LEAD_PROPERTY_TYPES, type LeadPropertyType } from '@/constants/property-types';

interface ImportBody {
  leads: Record<string, string>[];
  mapping: Record<string, string>;
}

/**
 * Normalize a currency/numeric string ("$1,200,000" -> "1200000").
 * Returns null for empty input, undefined if unparseable.
 */
function normalizeNumeric(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return undefined;
  return parsed.toString();
}

/**
 * Normalize a date string to ISO (YYYY-MM-DD). Accepts ISO-parseable dates
 * and MM/DD/YYYY (or M/D/YY) by converting.
 * Returns null for empty input, undefined if unparseable.
 */
function normalizeDate(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // MM/DD/YYYY or M/D/YY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isNaN(Date.parse(iso))) return undefined;
    return iso;
  }

  // ISO-parseable (e.g. YYYY-MM-DD)
  if (!isNaN(Date.parse(trimmed))) {
    const date = new Date(trimmed);
    return date.toISOString().split('T')[0];
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body: ImportBody = await request.json();

    if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
      return apiError('No lead data provided', 400);
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
      const propertyType = (LEAD_PROPERTY_TYPES as readonly string[]).includes(rawPropertyType)
        ? (rawPropertyType as LeadPropertyType)
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

      // Parse numeric fields — strip $ and commas, validate
      const salePrice = normalizeNumeric(row.sale_price ?? '');
      if (salePrice === undefined) {
        errors.push({
          row: index + 1,
          message: `Invalid sale_price: ${row.sale_price}`,
        });
        return;
      }
      const buildingValue = normalizeNumeric(row.building_value ?? '');
      if (buildingValue === undefined) {
        errors.push({
          row: index + 1,
          message: `Invalid building_value: ${row.building_value}`,
        });
        return;
      }
      const landValue = normalizeNumeric(row.land_value ?? '');
      if (landValue === undefined) {
        errors.push({
          row: index + 1,
          message: `Invalid land_value: ${row.land_value}`,
        });
        return;
      }

      // Parse date field — accept ISO and MM/DD/YYYY
      const saleDate = normalizeDate(row.sale_date ?? '');
      if (saleDate === undefined) {
        errors.push({
          row: index + 1,
          message: `Invalid sale_date: ${row.sale_date}`,
        });
        return;
      }

      const squareFootageRaw = (row.square_footage ?? '').trim();
      const squareFootage = squareFootageRaw ? parseInt(squareFootageRaw.replace(/[,\s]/g, ''), 10) : null;
      const yearBuiltRaw = (row.year_built ?? '').trim();
      const yearBuilt = yearBuiltRaw ? parseInt(yearBuiltRaw, 10) : null;

      validRows.push({
        userId: user.id,
        propertyAddress,
        propertyCity: (row.property_city ?? '').trim() || null,
        propertyCounty: (row.property_county ?? '').trim() || null,
        propertyState: (row.property_state ?? '').trim() || 'FL',
        propertyZip: (row.property_zip ?? '').trim() || null,
        propertyType,
        salePrice,
        saleDate,
        parcelId: (row.parcel_id ?? '').trim() || null,
        deedBookPage: (row.deed_book_page ?? '').trim() || null,
        buyerName: (row.buyer_name ?? '').trim() || null,
        buyerCompany: (row.buyer_company ?? '').trim() || null,
        buyerEmail: buyerEmail || null,
        buyerPhone: (row.buyer_phone ?? '').trim() || null,
        sellerName: (row.seller_name ?? '').trim() || null,
        squareFootage: squareFootage && !isNaN(squareFootage) ? squareFootage : null,
        yearBuilt: yearBuilt && !isNaN(yearBuilt) ? yearBuilt : null,
        buildingValue,
        landValue,
        status,
        priority,
        source: (row.source ?? '').trim() || null,
        notes: (row.notes ?? '').trim() || null,
        tags,
      });
    });

    let imported = 0;

    if (validRows.length > 0) {
      // Batch insert in chunks of 100 — a failed batch is reported, not fatal
      const BATCH_SIZE = 100;
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        try {
          await db.insert(leads).values(batch);
          imported += batch.length;
        } catch (batchError) {
          logger.error('leads-api', `Failed to insert lead batch starting at row ${i + 1}`, batchError);
          errors.push({
            row: i + 1,
            message: `Failed to insert batch of ${batch.length} rows (rows ${i + 1}-${i + batch.length})`,
          });
        }
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'POST /api/leads/import error', error);
    return apiError('Failed to import leads');
  }
}
