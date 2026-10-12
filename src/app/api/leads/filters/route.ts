import { NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { eq, count, asc, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

interface FilterOption {
  value: string;
  count: number;
}

/**
 * Options for the leads list's State and Tag filters: every state and tag on
 * the user's leads, with how many leads carry each.
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const [stateRows, tagRows] = await Promise.all([
      db
        .select({ value: leads.propertyState, count: count() })
        .from(leads)
        .where(eq(leads.userId, user.id))
        .groupBy(leads.propertyState)
        .orderBy(asc(leads.propertyState)),
      db.execute<{ value: string; count: number }>(sql`
        select t.tag as value, count(*)::int as count
        from ${leads}, unnest(${leads.tags}) as t(tag)
        where ${leads.userId} = ${user.id}
        group by t.tag
        order by count(*) desc, t.tag
      `),
    ]);

    const states: FilterOption[] = stateRows
      .filter((r): r is { value: string; count: number } => !!r.value)
      .map((r) => ({ value: r.value, count: r.count }));

    // Two-letter tags are state codes, already covered by the State filter
    const tags: FilterOption[] = Array.from(tagRows)
      .filter((r) => !/^[A-Z]{2}$/.test(r.value))
      .map((r) => ({ value: r.value, count: Number(r.count) }));

    return NextResponse.json({ states, tags });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('leads-api', 'GET /api/leads/filters error', error);
    return apiError('Failed to load lead filters');
  }
}
