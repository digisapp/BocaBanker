import { NextRequest, NextResponse } from 'next/server';
import { calculateRefinanceAnalysis } from '@/lib/mortgage/calculations';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentBalance, currentRate, remainingYears, newRate, newTermYears, closingCosts, points } = body;

    if (!currentBalance || currentBalance <= 0) {
      return NextResponse.json(
        { error: 'currentBalance must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof currentRate !== 'number' || currentRate < 0 || currentRate > 30) {
      return NextResponse.json(
        { error: 'currentRate must be between 0 and 30' },
        { status: 400 }
      );
    }

    if (typeof newRate !== 'number' || newRate < 0 || newRate > 30) {
      return NextResponse.json(
        { error: 'newRate must be between 0 and 30' },
        { status: 400 }
      );
    }

    if (!remainingYears || remainingYears <= 0 || remainingYears > 40) {
      return NextResponse.json(
        { error: 'remainingYears must be between 1 and 40' },
        { status: 400 }
      );
    }

    if (!newTermYears || newTermYears <= 0 || newTermYears > 40) {
      return NextResponse.json(
        { error: 'newTermYears must be between 1 and 40' },
        { status: 400 }
      );
    }

    const result = calculateRefinanceAnalysis(
      currentBalance,
      currentRate,
      remainingYears,
      newRate,
      newTermYears,
      closingCosts || 0,
      points || 0
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error('calculators-api', 'Refinance calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate refinance analysis' },
      { status: 500 }
    );
  }
}
