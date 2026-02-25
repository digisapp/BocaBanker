import { NextRequest, NextResponse } from 'next/server';
import { getDefaultAllocation } from '@/lib/cost-seg/asset-classes';
import { logger } from '@/lib/logger';
import {
  calculateDepreciation,
  calculateStraightLineDepreciation,
} from '@/lib/cost-seg/depreciation';
import { calculateTaxSavings } from '@/lib/cost-seg/tax-savings';
import { calculateNPV } from '@/lib/cost-seg/npv';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyValue, propertyType, taxRate, bonusDepreciationRate } = body;

    if (!propertyValue || propertyValue <= 0) {
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

    const rate = typeof taxRate === 'number' ? taxRate : 37;
    const bonusRate =
      typeof bonusDepreciationRate === 'number'
        ? Math.max(0, Math.min(100, bonusDepreciationRate))
        : 100;

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
    const totalSavings =
      taxSavings.length > 0
        ? taxSavings[taxSavings.length - 1].cumulativeSavings
        : 0;

    const annualFlows = taxSavings.map((e) => e.annualSavings);
    const npv = calculateNPV(annualFlows, 5);

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
    logger.error('calculators-api', 'Tax savings calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate tax savings' },
      { status: 500 }
    );
  }
}
