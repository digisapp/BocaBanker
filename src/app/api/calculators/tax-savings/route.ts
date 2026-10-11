import { NextRequest, NextResponse } from 'next/server';
import { getDefaultAllocation } from '@/lib/cost-seg/asset-classes';
import { logger } from '@/lib/logger';
import { ApiError } from '@/lib/api/auth';
import { readJson } from '@/lib/api/request';
import { readNumber } from '@/app/api/calculators/_lib/numbers';
import {
  calculateDepreciation,
  calculateStraightLineDepreciation,
} from '@/lib/cost-seg/depreciation';
import { calculateTaxSavings } from '@/lib/cost-seg/tax-savings';
import { calculateNPV } from '@/lib/cost-seg/npv';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const { propertyType } = body;
    const propertyValue = readNumber(body.propertyValue);
    const rate = readNumber(body.taxRate, 37);
    const bonusDepreciationRate = readNumber(body.bonusDepreciationRate, 100);
    const npvDiscountRate = readNumber(body.discountRate, 5);

    if (!(propertyValue > 0)) {
      return NextResponse.json(
        { error: 'propertyValue must be a positive number' },
        { status: 400 }
      );
    }

    const validTypes = [
      'commercial',
      'residential',
      'mixed-use',
      'industrial',
      'retail',
      'hospitality',
      'healthcare',
      'multifamily',
    ];

    if (!validTypes.includes(propertyType)) {
      return NextResponse.json(
        { error: `propertyType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!(rate >= 0 && rate <= 100)) {
      return NextResponse.json(
        { error: 'taxRate must be between 0 and 100' },
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

    if (!(npvDiscountRate >= 0)) {
      return NextResponse.json(
        { error: 'discountRate must be a non-negative number' },
        { status: 400 }
      );
    }

    // Get default allocation
    const allocation = getDefaultAllocation(propertyType, propertyValue);

    // Build combined accelerated schedule
    const assetSchedules: { year: number; depreciation: number }[][] = [];

    for (const item of allocation) {
      if (item.recoveryPeriod === 0) continue;
      const period = item.recoveryPeriod as MacrsRecoveryPeriod;
      const schedule = calculateDepreciation(item.amount, period, bonusRate);
      assetSchedules.push(
        schedule.map((e) => ({ year: e.year, depreciation: e.depreciation }))
      );
    }

    const maxYears = assetSchedules.reduce((max, s) => Math.max(max, s.length), 0);
    const combinedAccelerated: { year: number; depreciation: number }[] = [];
    for (let y = 0; y < maxYears; y++) {
      let total = 0;
      for (const schedule of assetSchedules) {
        if (y < schedule.length) total += schedule[y].depreciation;
      }
      combinedAccelerated.push({
        year: y + 1,
        depreciation: Math.round(total * 100) / 100,
      });
    }

    // Straight-line
    const isResidential = ['residential', 'multifamily'].includes(propertyType);
    const slPeriod: 27.5 | 39 = isResidential ? 27.5 : 39;
    const buildingBasis = allocation
      .filter((a) => a.recoveryPeriod !== 0)
      .reduce((sum, a) => sum + a.amount, 0);
    const straightLine = calculateStraightLineDepreciation(buildingBasis, slPeriod);
    const slEntries = straightLine.map((e) => ({
      year: e.year,
      depreciation: e.depreciation,
    }));

    // Tax savings
    const taxSavings = calculateTaxSavings(combinedAccelerated, slEntries, rate);

    const firstYearSavings = taxSavings.length > 0 ? taxSavings[0].annualSavings : 0;
    const fiveYearSavings =
      taxSavings.length >= 5
        ? taxSavings[4].cumulativeSavings
        : taxSavings.length > 0
        ? taxSavings[taxSavings.length - 1].cumulativeSavings
        : 0;
    // Cost seg is a timing benefit: lifetime cumulative savings net to ~zero,
    // so (like the calculators and study reports) total savings is the PEAK
    // cumulative savings, not the final cumulative value.
    const totalSavings = taxSavings.reduce(
      (max, e) => Math.max(max, e.cumulativeSavings),
      0
    );

    const annualFlows = taxSavings.map((e) => e.annualSavings);
    const npv = calculateNPV(annualFlows, npvDiscountRate);

    return NextResponse.json({
      propertyValue,
      propertyType,
      taxRate: rate,
      bonusDepreciationRate: bonusRate,
      allocation,
      firstYearSavings,
      fiveYearSavings,
      totalSavings,
      npv,
      schedule: taxSavings,
    });
  } catch (error) {
    if (error instanceof ApiError) return error.response;
    logger.error('calculators-api', 'Tax savings calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate tax savings' },
      { status: 500 }
    );
  }
}
