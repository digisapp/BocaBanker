import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

interface FreddieMacRate {
  weekOf: string;
  rate30yr: number | null;
  rate15yr: number | null;
  rate5arm: number | null;
}

/**
 * Parse Freddie Mac PMMS CSV data.
 * The CSV has columns: date, 30yr, 15yr, 5/1 ARM (and sometimes more).
 * Dates are in MM/DD/YYYY format.
 */
function parseCSV(csv: string): FreddieMacRate[] {
  const lines = csv.trim().split('\n');
  const rates: FreddieMacRate[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    if (cols.length < 2) continue;

    const dateStr = cols[0];
    if (!dateStr || dateStr === '') continue;

    // Parse MM/DD/YYYY or YYYY-MM-DD
    let weekOf: string;
    if (dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/');
      if (!year || !month || !day) continue;
      weekOf = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      weekOf = dateStr;
    }

    const rate30yr = cols[1] ? parseFloat(cols[1]) : null;
    const rate15yr = cols[2] ? parseFloat(cols[2]) : null;
    const rate5arm = cols[3] ? parseFloat(cols[3]) : null;

    if (rate30yr === null || isNaN(rate30yr)) continue;

    rates.push({
      weekOf,
      rate30yr: isNaN(rate30yr) ? null : rate30yr,
      rate15yr: rate15yr !== null && !isNaN(rate15yr) ? rate15yr : null,
      rate5arm: rate5arm !== null && !isNaN(rate5arm) ? rate5arm : null,
    });
  }

  return rates;
}

/**
 * Fetch latest rates from Freddie Mac PMMS public CSV.
 */
export async function fetchFreddieMacRates(): Promise<FreddieMacRate[]> {
  try {
    // Freddie Mac publishes weekly rates at this endpoint
    const res = await fetch(
      'https://www.freddiemac.com/pmms/docs/PMMS4.csv',
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!res.ok) {
      logger.error('rates', `Freddie Mac CSV fetch failed: ${res.status}`);
      return [];
    }

    const csv = await res.text();
    return parseCSV(csv);
  } catch (error) {
    logger.error('rates', 'Failed to fetch Freddie Mac rates', error);
    return [];
  }
}

/**
 * Get cached rates from DB, or fetch fresh if stale (>7 days old).
 */
export async function getCachedRates(forceRefresh = false) {
  // Check what we have in DB
  const { data: latestRow } = await supabaseAdmin
    .from('mortgage_rates')
    .select('*')
    .order('week_of', { ascending: false })
    .limit(1)
    .single();

  const now = new Date();
  const isStale =
    !latestRow ||
    forceRefresh ||
    (now.getTime() - new Date(latestRow.fetched_at).getTime()) > 7 * 24 * 60 * 60 * 1000;

  if (isStale) {
    const freshRates = await fetchFreddieMacRates();
    if (freshRates.length > 0) {
      // Get existing week_of dates to avoid duplicates
      const { data: existingRows } = await supabaseAdmin
        .from('mortgage_rates')
        .select('week_of');
      const existingWeeks = new Set(
        (existingRows || []).map((r: Record<string, unknown>) => r.week_of)
      );

      // Insert only new weeks (last 52)
      const recent = freshRates.slice(-52);
      const newRates = recent.filter((r) => !existingWeeks.has(r.weekOf));
      if (newRates.length > 0) {
        await supabaseAdmin.from('mortgage_rates').insert(
          newRates.map((rate) => ({
            week_of: rate.weekOf,
            rate_30yr: rate.rate30yr,
            rate_15yr: rate.rate15yr,
            rate_5_arm: rate.rate5arm,
            source: 'freddie_mac_pmms',
            fetched_at: new Date().toISOString(),
          }))
        );
      }
    }
  }

  // Return latest N weeks from DB
  const { data: rows } = await supabaseAdmin
    .from('mortgage_rates')
    .select('*')
    .order('week_of', { ascending: false })
    .limit(52);

  return (rows || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    weekOf: r.week_of as string,
    rate30yr: r.rate_30yr ? parseFloat(r.rate_30yr as string) : null,
    rate15yr: r.rate_15yr ? parseFloat(r.rate_15yr as string) : null,
    rate5arm: r.rate_5_arm ? parseFloat(r.rate_5_arm as string) : null,
    source: r.source as string,
    fetchedAt: r.fetched_at as string,
  }));
}

/**
 * Get rate trend for last N weeks (for charting).
 */
export async function getRateTrend(weeks = 12) {
  const rates = await getCachedRates();
  return rates.slice(0, weeks).reverse(); // Oldest first for chart
}
