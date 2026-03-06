import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const CSV_COLUMNS = [
  { key: 'property_address', label: 'Property Address' },
  { key: 'property_city', label: 'City' },
  { key: 'property_county', label: 'County' },
  { key: 'property_state', label: 'State' },
  { key: 'property_zip', label: 'Zip' },
  { key: 'property_type', label: 'Property Type' },
  { key: 'sale_price', label: 'Sale Price' },
  { key: 'sale_date', label: 'Sale Date' },
  { key: 'buyer_name', label: 'Buyer Name' },
  { key: 'buyer_company', label: 'Buyer Company' },
  { key: 'buyer_email', label: 'Email' },
  { key: 'buyer_phone', label: 'Phone' },
  { key: 'seller_name', label: 'Seller Name' },
  { key: 'member_name', label: 'LLC Member' },
  { key: 'member_address', label: 'Member Address' },
  { key: 'member_city', label: 'Member City' },
  { key: 'member_state', label: 'Member State' },
  { key: 'member_zip', label: 'Member Zip' },
  { key: 'square_footage', label: 'Sq Ft' },
  { key: 'year_built', label: 'Year Built' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'tags', label: 'Tags' },
  { key: 'created_at', label: 'Created' },
];

function escapeCsvField(value: unknown): string {
  if (value == null) return '';
  const str = Array.isArray(value) ? value.join(', ') : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const propertyType = searchParams.get('propertyType') ?? '';
    const priority = searchParams.get('priority') ?? '';
    const member = searchParams.get('member') ?? '';

    // Build query — fetch all matching rows (no pagination)
    const selectColumns = CSV_COLUMNS.map((c) => c.key).join(',');
    let query = supabaseAdmin.from('leads').select(selectColumns);

    if (search) {
      const s = search.replace(/[%_\\]/g, (c) => `\\${c}`);
      query = query.or(
        `property_address.ilike.%${s}%,buyer_name.ilike.%${s}%,buyer_company.ilike.%${s}%,property_city.ilike.%${s}%,property_county.ilike.%${s}%`
      );
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (propertyType && propertyType !== 'all') {
      query = query.eq('property_type', propertyType);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    if (member) {
      query = query.eq('member_name', member);
    }

    query = query.order('created_at', { ascending: false });

    const { data: rows, error } = await query;

    if (error) {
      logger.error('leads-export', 'Supabase query error', error);
      return apiError('Failed to export leads');
    }

    // Build CSV
    const header = CSV_COLUMNS.map((c) => c.label).join(',');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lines = ((rows || []) as any[]).map((row: Record<string, unknown>) =>
      CSV_COLUMNS.map((c) => escapeCsvField(row[c.key])).join(',')
    );
    const csv = [header, ...lines].join('\n');

    const date = new Date().toISOString().slice(0, 10);
    const filename = `leads-export-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-export', 'GET /api/leads/export error', error);
    return apiError('Failed to export leads');
  }
}
