import { NextRequest, NextResponse } from 'next/server';
import { getDefaultAllocation } from '@/lib/cost-seg/asset-classes';
import { logger } from '@/lib/logger';
import { calculateBonusDepreciation } from '@/lib/cost-seg/bonus-depreciation';
import { calculateStraightLineDepreciation } from '@/lib/cost-seg/depreciation';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buildingValue, propertyType, bonusRate: inputBonusRate } = body;

    if (!buildingValue || buildingValue <= 0) {
      return NextResponse.json(
        { error: 'buildingValue must be a positive number' },
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

    const bonusRate =
      typeof inputBonusRate === 'number'
        ? Math.max(0, Math.min(100, inputBonusRate))
        : 100;

    const allocation = getDefaultAllocation(propertyType, buildingValue);
    const isResidential = ['residential', 'multifamily'].includes(propertyType);
    const slPeriod: 27.5 | 39 = isResidential ? 27.5 : 39;

    // Without cost seg
    const landAlloc = allocation.find((a) => a.recoveryPeriod === 0);
    const buildingBasis = buildingValue - (landAlloc ? landAlloc.amount : 0);
    const straightLine = calculateStraightLineDepreciation(buildingBasis, slPeriod);
    const withoutCostSegFirstYear =
      straightLine.length > 0 ? straightLine[0].depreciation : 0;

    // With cost seg
    let totalBonusDep = 0;
    let totalFirstYear = 0;
    let reclassifiedAmount = 0;

    const breakdown = allocation.map((item) => {
      const bonusEligible = item.recoveryPeriod > 0 && item.recoveryPeriod <= 20;

      if (item.recoveryPeriod === 0) {
        return {
          category: item.category,
          description: item.description,
          amount: item.amount,
          percentage: item.percentage,
          bonusEligible: false,
          firstYearDeduction: 0,
        };
      }

      const period = item.recoveryPeriod as MacrsRecoveryPeriod;
      const bonusResult = calculateBonusDepreciation(item.amount, period, bonusRate);

      if (bonusEligible) {
        reclassifiedAmount += item.amount;
        totalBonusDep += bonusResult.bonusAmount;
      }

      totalFirstYear += bonusResult.firstYearTotal;

      return {
        category: item.category,
        description: item.description,
        amount: item.amount,
        percentage: item.percentage,
        bonusEligible,
        firstYearDeduction: bonusResult.firstYearTotal,
      };
    });

    const reclassifiedPercentage =
      buildingValue > 0 ? (reclassifiedAmount / buildingValue) * 100 : 0;

    return NextResponse.json({
      buildingValue,
      propertyType,
      bonusRate,
      reclassifiedPercentage: Math.round(reclassifiedPercentage * 10) / 10,
      reclassifiedAmount: Math.round(reclassifiedAmount * 100) / 100,
      bonusDepreciationTotal: Math.round(totalBonusDep * 100) / 100,
      withoutCostSegFirstYear: Math.round(withoutCostSegFirstYear * 100) / 100,
      withCostSegFirstYear: Math.round(totalFirstYear * 100) / 100,
      additionalDeduction: Math.round((totalFirstYear - withoutCostSegFirstYear) * 100) / 100,
      breakdown,
    });
  } catch (error) {
    logger.error('calculators-api', 'Bonus depreciation calculation error', error);
    return NextResponse.json(
      { error: 'Failed to calculate bonus depreciation' },
      { status: 500 }
    );
  }
}
