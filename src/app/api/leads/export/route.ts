import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const CSV_COLUMNS = [
  { key: 'propertyAddress', label: 'Property Address' },
  { key: 'propertyCity', label: 'City' },
  { key: 'propertyCounty', label: 'County' },
  { key: 'propertyState', label: 'State' },
  { key: 'propertyZip', label: 'Zip' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'salePrice', label: 'Sale Price' },
  { key: 'saleDate', label: 'Sale Date' },
  { key: 'buyerName', label: 'Buyer Name' },
  { key: 'buyerCompany', label: 'Buyer Company' },
  { key: 'buyerEmail', label: 'Email' },
  { key: 'buyerPhone', label: 'Phone' },
  { key: 'sellerName', label: 'Seller Name' },
  { key: 'memberName', label: 'LLC Member' },
  { key: 'memberAddress', label: 'Member Address' },
  { key: 'memberCity', label: 'Member City' },
  { key: 'memberState', label: 'Member State' },
  { key: 'memberZip', label: 'Member Zip' },
  { key: 'squareFootage', label: 'Sq Ft' },
  { key: 'yearBuilt', label: 'Year Built' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
  { key: 'tags', label: 'Tags' },
  { key: 'createdAt', label: 'Created' },
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

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(leads.propertyAddress, `%${search}%`),
          ilike(leads.buyerName, `%${search}%`),
          ilike(leads.buyerCompany, `%${search}%`),
          ilike(leads.propertyCity, `%${search}%`),
          ilike(leads.propertyCounty, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(leads.status, status as typeof leads.status.enumValues[number]));
    }

    if (propertyType && propertyType !== 'all') {
      conditions.push(eq(leads.propertyType, propertyType as typeof leads.propertyType.enumValues[number]));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(leads.priority, priority as typeof leads.priority.enumValues[number]));
    }

    if (member) {
      conditions.push(eq(leads.memberName, member));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(leads)
      .where(whereClause)
      .orderBy(desc(leads.createdAt));

    // Build CSV
    const header = CSV_COLUMNS.map((c) => c.label).join(',');
    const lines = rows.map((row: Record<string, unknown>) =>
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
