import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { getCachedRates } from '@/lib/mortgage/rates';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    // Fetch rates (last 12 weeks for trend)
    const allRates = await getCachedRates();
    const trend = allRates.slice(0, 12).reverse();

    const currentRate30yr = allRates.length > 0 ? allRates[0].rate30yr : null;
    const currentRate15yr = allRates.length > 0 ? allRates[0].rate15yr : null;
    const previousRate30yr = allRates.length > 1 ? allRates[1].rate30yr : null;
    const rateChange30yr =
      currentRate30yr !== null && previousRate30yr !== null
        ? Math.round((currentRate30yr - previousRate30yr) * 100) / 100
        : null;

    // Pipeline summary
    const { data: pipelineRows } = await supabaseAdmin
      .from('loans')
      .select('status, loan_amount')
      .eq('user_id', user.id)
      .not('status', 'in', '("closed","withdrawn")');

    const pipeline = {
      preQual: 0,
      application: 0,
      processing: 0,
      underwriting: 0,
      clearToClose: 0,
      total: 0,
      totalVolume: 0,
    };

    for (const row of pipelineRows || []) {
      const amount = parseFloat(row.loan_amount as string) || 0;
      pipeline.total++;
      pipeline.totalVolume += amount;
      switch (row.status) {
        case 'pre_qual':
          pipeline.preQual++;
          break;
        case 'application':
          pipeline.application++;
          break;
        case 'processing':
          pipeline.processing++;
          break;
        case 'underwriting':
          pipeline.underwriting++;
          break;
        case 'clear_to_close':
          pipeline.clearToClose++;
          break;
      }
    }

    // Commission MTD & YTD
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart = `${now.getFullYear()}-01-01`;

    const { data: fundedLoans } = await supabaseAdmin
      .from('loans')
      .select('commission_amount, actual_closing_date, status')
      .eq('user_id', user.id)
      .in('status', ['funded', 'closed']);

    let commissionMTD = 0;
    let commissionYTD = 0;
    let loansFundedMTD = 0;
    let loansFundedYTD = 0;

    for (const loan of fundedLoans || []) {
      const amount = parseFloat(loan.commission_amount as string) || 0;
      const closeDate = loan.actual_closing_date as string;
      if (closeDate && closeDate >= yearStart) {
        commissionYTD += amount;
        loansFundedYTD++;
        if (closeDate >= monthStart) {
          commissionMTD += amount;
          loansFundedMTD++;
        }
      }
    }

    return NextResponse.json({
      currentRate30yr,
      currentRate15yr,
      rateChange30yr,
      rateTrend: trend.map((r) => ({
        weekOf: r.weekOf,
        rate30yr: r.rate30yr ?? 0,
        rate15yr: r.rate15yr ?? 0,
      })),
      pipelineSummary: pipeline,
      commissionMTD: Math.round(commissionMTD * 100) / 100,
      commissionYTD: Math.round(commissionYTD * 100) / 100,
      loansFundedMTD,
      loansFundedYTD,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('mortgage-stats', 'GET /api/mortgage/stats error', error);
    return apiError('Failed to fetch mortgage stats');
  }
}
