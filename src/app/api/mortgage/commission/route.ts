import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ApiError } from '@/lib/api/auth';
import { apiError } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Get all funded/closed loans
    const { data: loans } = await supabaseAdmin
      .from('loans')
      .select('borrower_name, loan_amount, commission_bps, commission_amount, actual_closing_date, lender_name, status')
      .eq('user_id', user.id)
      .in('status', ['funded', 'closed'])
      .order('actual_closing_date', { ascending: false });

    let commissionMTD = 0;
    let commissionYTD = 0;
    let loansFundedMTD = 0;
    let loansFundedYTD = 0;
    let totalBps = 0;
    let bpsCount = 0;

    // Monthly breakdown for the current year
    const monthlyCommission: Record<string, number> = {};
    for (let m = 0; m < 12; m++) {
      const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
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

      if (closeDate && closeDate >= yearStart) {
        commissionYTD += amount;
        loansFundedYTD++;

        // Monthly breakdown
        const monthKey = closeDate.substring(0, 7);
        if (monthlyCommission[monthKey] !== undefined) {
          monthlyCommission[monthKey] += amount;
        }

        if (closeDate >= monthStart) {
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
