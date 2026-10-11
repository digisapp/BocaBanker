import { NextRequest, NextResponse } from 'next/server';
import { calculateRefinanceAnalysis } from '@/lib/mortgage/calculations';
import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api/auth';
import { readJson } from '@/lib/api/request';
import { readNumber } from '@/app/api/calculators/_lib/numbers';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const currentBalance = readNumber(body.currentBalance);
    const currentRate = readNumber(body.currentRate);
    const remainingYears = readNumber(body.remainingYears);
    const newRate = readNumber(body.newRate);
    const newTermYears = readNumber(body.newTermYears);
    const closingCosts = readNumber(body.closingCosts, 0);
    const points = readNumber(body.points, 0);

    if (!(currentBalance > 0)) {
      return NextResponse.json(
        { error: 'currentBalance must be a positive number' },
        { status: 400 }
      );
    }

    if (!(currentRate >= 0 && currentRate <= 30)) {
      return NextResponse.json(
        { error: 'currentRate must be between 0 and 30' },
        { status: 400 }
      );
    }

    if (!(newRate >= 0 && newRate <= 30)) {
      return NextResponse.json(
        { error: 'newRate must be between 0 and 30' },
        { status: 400 }
      );
    }

    if (!(remainingYears > 0 && remainingYears <= 40)) {
      return NextResponse.json(
        { error: 'remainingYears must be between 1 and 40' },
        { status: 400 }
      );
    }

    if (!(newTermYears > 0 && newTermYears <= 40)) {
      return NextResponse.json(
        { error: 'newTermYears must be between 1 and 40' },
        { status: 400 }
      );
    }

    if (Number.isNaN(closingCosts) || Number.isNaN(points)) {
      return NextResponse.json(
        { error: 'closingCosts and points must be numbers' },
        { status: 400 }
      );
    }

    const result = calculateRefinanceAnalysis(
      currentBalance,
      currentRate,
      remainingYears,
      newRate,
      newTermYears,
      closingCosts,
      points
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('calculators-api', 'Refinance calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate refinance analysis' },
      { status: 500 }
    );
  }
}
