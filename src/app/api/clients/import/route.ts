import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { logger } from '@/lib/logger';
import { clients } from '@/db/schema';

interface ImportBody {
  clients: Record<string, string>[];
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

    if (!body.clients || !Array.isArray(body.clients) || body.clients.length === 0) {
      return NextResponse.json(
        { error: 'No client data provided' },
        { status: 400 }
      );
    }

    const errors: { row: number; message: string }[] = [];
    const validRows: (typeof clients.$inferInsert)[] = [];

    body.clients.forEach((row, index) => {
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
      });
    });

    let imported = 0;

    if (validRows.length > 0) {
      // Batch insert in chunks of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        await db.insert(clients).values(batch);
        imported += batch.length;
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    logger.error('clients-api', 'POST /api/clients/import error', error);
    return NextResponse.json(
      { error: 'Failed to import clients' },
      { status: 500 }
    );
  }
}
