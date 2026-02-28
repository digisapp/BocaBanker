import { NextRequest, NextResponse } from 'next/server';
import { calculateMortgage } from '@/lib/mortgage/calculations';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanAmount, interestRate, termYears, propertyTax, insurance } = body;

    if (!loanAmount || loanAmount <= 0) {
      return NextResponse.json(
        { error: 'loanAmount must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof interestRate !== 'number' || interestRate < 0 || interestRate > 30) {
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

    const result = calculateMortgage(
      loanAmount,
      interestRate,
      termYears,
      propertyTax || 0,
      insurance || 0
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error('calculators-api', 'Mortgage calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate mortgage' },
      { status: 500 }
    );
  }
}
