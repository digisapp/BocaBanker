import { NextRequest, NextResponse } from 'next/server';
import { calculateDepreciation } from '@/lib/cost-seg/depreciation';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { costBasis, recoveryPeriod, bonusDepreciationRate } = body;

    if (!costBasis || costBasis <= 0) {
      return NextResponse.json(
        { error: 'costBasis must be a positive number' },
        { status: 400 }
      );
    }

    const validPeriods = [5, 7, 15, 27.5, 39];
    if (!validPeriods.includes(recoveryPeriod)) {
      return NextResponse.json(
        { error: `recoveryPeriod must be one of: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }

    const bonusRate =
      typeof bonusDepreciationRate === 'number'
        ? Math.max(0, Math.min(100, bonusDepreciationRate))
        : 100;

    const schedule = calculateDepreciation(
      costBasis,
      recoveryPeriod as MacrsRecoveryPeriod,
      bonusRate
    );

    return NextResponse.json({
      costBasis,
      recoveryPeriod,
      bonusDepreciationRate: bonusRate,
      schedule,
    });
  } catch (error) {
    console.error('Depreciation calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate depreciation schedule' },
      { status: 500 }
    );
  }
}
