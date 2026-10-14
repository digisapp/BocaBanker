import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { readJson } from '@/lib/api/request';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { clients } from '@/db/schema';
import { insertInBatches, type ImportRow } from '@/lib/csv/batch-insert';

const MAX_IMPORT_ROWS = 5000;

interface ImportBody {
  clients: Record<string, string>[];
  mapping: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await readJson<ImportBody | null>(request);

    if (!body || !Array.isArray(body.clients) || body.clients.length === 0) {
      return apiError('No client data provided', 400);
    }

    if (body.clients.length > MAX_IMPORT_ROWS) {
      return apiError(`Too many rows (max ${MAX_IMPORT_ROWS} per import)`, 400);
    }

    // CSV rows should be string maps, but JSON bodies can carry numbers/null/
    // objects — coerce so `.trim()` below can't throw and 500 the import.
    const inputRows: Record<string, string>[] = body.clients.map((raw) => {
      const out: Record<string, string> = {};
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (v != null && typeof v !== 'object') out[k] = String(v);
        }
      }
      return out;
    });

    const errors: { row: number; message: string }[] = [];
    const validRows: ImportRow<typeof clients.$inferInsert>[] = [];

    inputRows.forEach((row, index) => {
      const firstName = (row.first_name ?? '').trim();
      const lastName = (row.last_name ?? '').trim();

      if (!firstName || !lastName) {
        errors.push({
          row: index + 1,
          message: `Missing required field(s): ${!firstName ? 'first_name' : ''}${!firstName && !lastName ? ', ' : ''}${!lastName ? 'last_name' : ''}`.trim(),
        });
        return;
      }

      // Validate email format if provided
      const email = (row.email ?? '').trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          row: index + 1,
          message: `Invalid email format: ${email}`,
        });
        return;
      }

      // Validate status if provided
      const rawStatus = (row.status ?? '').trim().toLowerCase();
      const status =
        rawStatus === 'active' || rawStatus === 'prospect' || rawStatus === 'inactive'
          ? rawStatus
          : 'active';

      // Parse tags (comma-separated string)
      const tagsRaw = (row.tags ?? '').trim();
      const tags = tagsRaw
        ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      validRows.push({
        row: index + 1,
        values: {
          userId: user.id,
          firstName,
          lastName,
          email: email || null,
          phone: (row.phone ?? '').trim() || null,
          company: (row.company ?? '').trim() || null,
          address: (row.address ?? '').trim() || null,
          city: (row.city ?? '').trim() || null,
          state: (row.state ?? '').trim() || null,
          zip: (row.zip ?? '').trim() || null,
          status,
          tags,
          notes: (row.notes ?? '').trim() || null,
          source: (row.source ?? '').trim() || null,
        },
      });
    });

    // Batch insert in chunks of 100 — a failed batch is retried row by row,
    // and errors carry the real CSV row number
    const inserted = await insertInBatches(
      validRows,
      (values) => db.insert(clients).values(values),
      (message, err) => logger.error('clients-api', `Client import: ${message}`, err),
    );
    errors.push(...inserted.errors);
    errors.sort((a, b) => a.row - b.row);

    return NextResponse.json({ imported: inserted.imported, errors });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('clients-api', 'POST /api/clients/import error', error);
    return apiError('Failed to import clients');
  }
}
