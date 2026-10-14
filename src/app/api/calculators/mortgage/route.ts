import { NextRequest, NextResponse } from 'next/server';
import { calculateMortgage } from '@/lib/mortgage/calculations';
import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api/auth';
import { readJson } from '@/lib/api/request';
import { readNumber } from '@/app/api/calculators/_lib/numbers';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const loanAmount = readNumber(body.loanAmount);
    const interestRate = readNumber(body.interestRate);
    const termYears = readNumber(body.termYears);
    const propertyTax = readNumber(body.propertyTax, 0);
    const insurance = readNumber(body.insurance, 0);

    if (!(loanAmount > 0)) {
      return NextResponse.json(
        { error: 'loanAmount must be a positive number' },
        { status: 400 }
      );
    }

    if (!(interestRate >= 0 && interestRate <= 30)) {
      return NextResponse.json(
        { error: 'interestRate must be between 0 and 30' },
        { status: 400 }
      );
    }

    const validTerms = [10, 15, 20, 25, 30];
    if (!validTerms.includes(termYears)) {
      return NextResponse.json(
        { error: `termYears must be one of: ${validTerms.join(', ')}` },
        { status: 400 }
      );
    }

    if (!(propertyTax >= 0) || !(insurance >= 0)) {
      return NextResponse.json(
        { error: 'propertyTax and insurance must be non-negative numbers' },
        { status: 400 }
      );
    }

    const result = calculateMortgage(
      loanAmount,
      interestRate,
      termYears,
      propertyTax,
      insurance
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('calculators-api', 'Mortgage calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate mortgage' },
      { status: 500 }
    );
  }
}
