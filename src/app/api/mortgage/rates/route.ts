import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { getCachedRates } from '@/lib/mortgage/rates';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

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

    const rates = await getCachedRates(true); // force refresh
    return NextResponse.json({ rates, refreshed: true });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('mortgage-rates', 'POST /api/mortgage/rates error', error);
    return apiError('Failed to refresh rates');
  }
}
