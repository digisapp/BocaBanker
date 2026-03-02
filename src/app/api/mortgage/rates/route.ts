import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getCachedRates } from '@/lib/mortgage/rates';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rates = await getCachedRates();
    return NextResponse.json({ rates });
  } catch (error) {
    logger.error('mortgage-rates', 'GET /api/mortgage/rates error', error);
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rates = await getCachedRates(true); // force refresh
    return NextResponse.json({ rates, refreshed: true });
  } catch (error) {
    logger.error('mortgage-rates', 'POST /api/mortgage/rates error', error);
    return NextResponse.json(
      { error: 'Failed to refresh rates' },
      { status: 500 }
    );
  }
}
