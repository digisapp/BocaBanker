import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { businessPeriods, isDateInRange } from '@/lib/dates';
import { CLOSED_LOAN_STATUSES } from '@/lib/loans';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    // Month/year in Eastern time — the server's UTC clock rolled the month
    // over at 8pm on its last day. Bounded on both ends so a date entered
    // in a later month/year doesn't count toward this one.
    const period = businessPeriods();

    // Get all funded/closed loans
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('borrower_name, loan_amount, commission_bps, commission_amount, actual_closing_date, lender_name, status')
      .eq('user_id', user.id)
      .in('status', [...CLOSED_LOAN_STATUSES])
      .order('actual_closing_date', { ascending: false, nullsFirst: false });

    if (loansError) {
      logger.error('commission-api', 'Failed to fetch funded loans', loansError);
      return apiError('Failed to fetch commission data');
    }

    let commissionMTD = 0;
    let commissionYTD = 0;
    let loansFundedMTD = 0;
    let loansFundedYTD = 0;
    let totalBps = 0;
    let bpsCount = 0;

    // Monthly breakdown for the current year
    const monthlyCommission: Record<string, number> = {};
    for (let m = 0; m < 12; m++) {
      const key = `${period.year}-${String(m + 1).padStart(2, '0')}`;
      monthlyCommission[key] = 0;
    }

    const recentCommissions: {
      borrowerName: string;
      loanAmount: number;
      commissionBps: number | null;
      commissionAmount: number;
      actualClosingDate: string;
      lenderName: string | null;
    }[] = [];

    for (const loan of loans || []) {
      const amount = parseFloat(loan.commission_amount as string) || 0;
      const closeDate = loan.actual_closing_date as string;
      const bps = loan.commission_bps as number | null;

      if (bps != null) {
        totalBps += bps;
        bpsCount++;
      }

      if (isDateInRange(closeDate, period.yearStart, period.nextYearStart)) {
        commissionYTD += amount;
        loansFundedYTD++;

        // Monthly breakdown
        const monthKey = closeDate.substring(0, 7);
        if (monthlyCommission[monthKey] !== undefined) {
          monthlyCommission[monthKey] += amount;
        }

        if (isDateInRange(closeDate, period.monthStart, period.nextMonthStart)) {
          commissionMTD += amount;
          loansFundedMTD++;
        }
      }

      recentCommissions.push({
        borrowerName: loan.borrower_name as string,
        loanAmount: parseFloat(loan.loan_amount as string) || 0,
        commissionBps: bps,
        commissionAmount: amount,
        actualClosingDate: closeDate || '',
        lenderName: loan.lender_name as string | null,
      });
    }

    const avgBps = bpsCount > 0 ? Math.round(totalBps / bpsCount) : 0;

    return NextResponse.json({
      commissionMTD: Math.round(commissionMTD * 100) / 100,
      commissionYTD: Math.round(commissionYTD * 100) / 100,
      loansFundedMTD,
      loansFundedYTD,
      avgBps,
      monthlyBreakdown: Object.entries(monthlyCommission).map(([month, amount]) => ({
        month,
        amount: Math.round(amount * 100) / 100,
      })),
      recentCommissions: recentCommissions.slice(0, 20),
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('commission-api', 'GET /api/mortgage/commission error', error);
    return apiError('Failed to fetch commission data');
  }
}
