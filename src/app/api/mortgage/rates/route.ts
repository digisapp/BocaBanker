import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { getCachedRates } from '@/lib/mortgage/rates';

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();

    const rates = await getCachedRates();
    return NextResponse.json({ rates });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('mortgage-rates', 'GET /api/mortgage/rates error', error);
    return apiError('Failed to fetch rates');
  }
}

export async function POST(_request: NextRequest) {
  try {
    const user = await requireAuth();

    // Force-refresh hits the upstream rates API and rewrites the cache —
    // throttle so it can't be hammered
    const rl = await rateLimit(`mortgage-rates-refresh:${user.id}`, { maxRequests: 5, windowMs: 10 * 60_000 });
    if (!rl.success) {
      return apiError('Too many refresh requests. Please try again later.', 429);
    }

    const rates = await getCachedRates(true); // force refresh
    return NextResponse.json({ rates, refreshed: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('mortgage-rates', 'POST /api/mortgage/rates error', error);
    return apiError('Failed to refresh rates');
  }
}
