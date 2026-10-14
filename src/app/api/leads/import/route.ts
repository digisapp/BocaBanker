import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { readJson } from '@/lib/api/request';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { leads } from '@/db/schema';
import { LEAD_PROPERTY_TYPES, type LeadPropertyType } from '@/constants/property-types';
import { normalizeDate, normalizeInteger, normalizeNumeric } from '@/lib/csv/normalize';
import { insertInBatches, type ImportRow } from '@/lib/csv/batch-insert';
import { IMPORT_CONVERTED_STATUS_ERROR } from '@/lib/leads';

const MAX_IMPORT_ROWS = 5000;

interface ImportBody {
  leads: Record<string, string>[];
  mapping: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await readJson<ImportBody | null>(request);

    if (!body || !Array.isArray(body.leads) || body.leads.length === 0) {
      return apiError('No lead data provided', 400);
    }

    if (body.leads.length > MAX_IMPORT_ROWS) {
      return apiError(`Too many rows (max ${MAX_IMPORT_ROWS} per import)`, 400);
    }

    // CSV rows should be string maps, but JSON bodies can carry numbers/null/
    // objects — coerce so `.trim()` below can't throw and 500 the import.
    const inputRows: Record<string, string>[] = body.leads.map((raw) => {
      const out: Record<string, string> = {};
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (v != null && typeof v !== 'object') out[k] = String(v);
        }
      }
      return out;
    });

    const errors: { row: number; message: string }[] = [];
    const validRows: ImportRow<typeof leads.$inferInsert>[] = [];

    inputRows.forEach((row, index) => {
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

      // Validate status if provided. "converted" is set only by the Convert
      // action (it creates the client); an imported converted lead has none.
      const rawStatus = (row.status ?? '').trim().toLowerCase();
      if (rawStatus === 'converted') {
        errors.push({ row: index + 1, message: IMPORT_CONVERTED_STATUS_ERROR });
        return;
      }
      const validStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'lost'];
      const status = validStatuses.includes(rawStatus)
        ? (rawStatus as 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'lost')
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

      // Parse numeric fields — strip $ and commas, allow K/M suffixes; the
      // whole cell must be numeric (no reading "12abc" as 12)
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

      // Parse date field — ISO, MM/DD/YYYY, "Mar 3, 2026"; impossible dates
      // (Feb 30) are rejected rather than failing the whole insert batch
      const saleDate = normalizeDate(row.sale_date ?? '');
      if (saleDate === undefined) {
        errors.push({
          row: index + 1,
          message: `Invalid sale_date: ${row.sale_date}`,
        });
        return;
      }

      // Secondary building facts: unreadable or out-of-range values (incl. the
      // 0 county records use for "unknown") are dropped rather than failing
      // the row. Bounds match the edit form's and keep sqft inside int4.
      const squareFootage = normalizeInteger(row.square_footage ?? '', { min: 1, max: 2_000_000_000 }) ?? null;
      const yearBuilt = normalizeInteger(row.year_built ?? '', { min: 1000, max: 2100 }) ?? null;

      validRows.push({
        row: index + 1,
        values: {
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
          squareFootage,
          yearBuilt,
          buildingValue,
          landValue,
          status,
          priority,
          source: (row.source ?? '').trim() || null,
          notes: (row.notes ?? '').trim() || null,
          tags,
        },
      });
    });

    // Batch insert in chunks of 100 — a failed batch is retried row by row,
    // and errors carry the real CSV row number
    const inserted = await insertInBatches(
      validRows,
      (values) => db.insert(leads).values(values),
      (message, err) => logger.error('leads-api', `Lead import: ${message}`, err),
    );
    errors.push(...inserted.errors);
    errors.sort((a, b) => a.row - b.row);

    return NextResponse.json({ imported: inserted.imported, errors });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'POST /api/leads/import error', error);
    return apiError('Failed to import leads');
  }
}
