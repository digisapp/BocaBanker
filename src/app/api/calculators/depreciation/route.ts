import { NextRequest, NextResponse } from 'next/server';
import { calculateDepreciation } from '@/lib/cost-seg/depreciation';
import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api/auth';
import { readJson } from '@/lib/api/request';
import { readNumber } from '@/app/api/calculators/_lib/numbers';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const costBasis = readNumber(body.costBasis);
    const recoveryPeriod = readNumber(body.recoveryPeriod);
    const bonusDepreciationRate = readNumber(body.bonusDepreciationRate, 100);

    if (!(costBasis > 0)) {
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

    if (Number.isNaN(bonusDepreciationRate)) {
      return NextResponse.json(
        { error: 'bonusDepreciationRate must be a number' },
        { status: 400 }
      );
    }
    const bonusRate = Math.max(0, Math.min(100, bonusDepreciationRate));

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
    if (error instanceof ApiError) return error.response;
    logger.error('calculators-api', 'Depreciation calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate depreciation schedule' },
      { status: 500 }
    );
  }
}
