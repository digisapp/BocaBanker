import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { eq, and, ilike, desc, asc, sql, count, or } from 'drizzle-orm';
import { clientSchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '10')));
    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const sort = searchParams.get('sort') ?? 'createdAt';
    const order = searchParams.get('order') ?? 'desc';

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(clients.userId, user.id)];

    if (search) {
      conditions.push(
        or(
          ilike(clients.firstName, `%${search}%`),
          ilike(clients.lastName, `%${search}%`),
          ilike(clients.email, `%${search}%`),
          ilike(clients.company, `%${search}%`)
        )!
      );
    }

    if (status && status !== 'all') {
      conditions.push(eq(clients.status, status as 'active' | 'prospect' | 'inactive'));
    }

    const whereClause = and(...conditions);

    // Determine sort column
    const getSortColumn = (key: string) => {
      switch (key) {
        case 'firstName': return clients.firstName;
        case 'lastName': return clients.lastName;
        case 'email': return clients.email;
        case 'company': return clients.company;
        case 'status': return clients.status;
        default: return clients.createdAt;
      }
    };

    const sortColumn = getSortColumn(sort);
    const orderFn = order === 'asc' ? asc : desc;

    // Query clients
    const [clientRows, totalResult] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(clients)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return NextResponse.json({
      clients: clientRows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const parsed = clientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Convert comma-separated tags string to array
    const tagsArray = data.tags
      ? data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const [created] = await db
      .insert(clients)
      .values({
        userId: user.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        status: data.status,
        tags: tagsArray,
        notes: data.notes || null,
        source: data.source || null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
