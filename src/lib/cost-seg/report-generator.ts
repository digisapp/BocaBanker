/**
 * Cost Segregation Study Report Generator
 *
 * Composes results from all calculation modules to produce a comprehensive
 * cost segregation study report with depreciation schedules, tax savings,
 * and NPV analysis.
 */

import { calculateBonusDepreciation } from './bonus-depreciation';
import { calculateDepreciation, calculateStraightLineDepreciation } from './depreciation';
import { type MacrsRecoveryPeriod, getMacrsRates } from './macrs-tables';
import { calculateNPV } from './npv';
import { calculateTaxSavings } from './tax-savings';

// ---------------------------------------------------------------------------
// Input / Output interfaces
// ---------------------------------------------------------------------------

export interface StudyReportInput {
  propertyAddress: string;
  propertyType: string;
  purchasePrice: number;
  buildingValue: number;
  landValue: number;
  studyYear: number;
  taxRate: number;
  discountRate: number;
  bonusDepreciationRate: number;
  assets: { category: string; costBasis: number; recoveryPeriod: number }[];
}

export interface StudyReport {
  summary: {
    totalReclassified: number;
    totalFirstYearDeduction: number;
    totalTaxSavings: number;
    npvTaxSavings: number;
    effectiveRate: number;
  };
  assetBreakdown: {
    category: string;
    amount: number;
    percentage: number;
    recoveryPeriod: number;
  }[];
  depreciationSchedule: {
    year: number;
    accelerated: number;
    straightLine: number;
    difference: number;
  }[];
  taxSavingsSchedule: {
    year: number;
    withCostSeg: number;
    withoutCostSeg: number;
    savings: number;
    cumulativeSavings: number;
  }[];
  firstYearAnalysis: {
    bonusDepreciation: number;
    regularFirstYear: number;
    totalFirstYear: number;
    taxSavings: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determines the straight-line recovery period based on property type.
 * Residential properties use 27.5 years; all others use 39 years.
 */
function getStraightLineRecoveryPeriod(propertyType: string): 27.5 | 39 {
  const residential = ['residential', 'multifamily'];
  return residential.includes(propertyType.toLowerCase()) ? 27.5 : 39;
}

/**
 * Validates that a number is a valid MacrsRecoveryPeriod.
 */
function isValidRecoveryPeriod(period: number): period is MacrsRecoveryPeriod {
  return [5, 7, 15, 27.5, 39].includes(period);
}

// ---------------------------------------------------------------------------
// Report Generator
// ---------------------------------------------------------------------------

/**
 * Generates a comprehensive cost segregation study report.
 *
 * This function orchestrates all calculation modules:
 * 1. Calculates accelerated depreciation for each reclassified asset
 * 2. Calculates straight-line depreciation (without cost seg) for comparison
 * 3. Compares schedules to determine annual and cumulative tax savings
 * 4. Computes NPV of the tax savings stream
 * 5. Produces a first-year analysis with bonus depreciation detail
 *
 * @param input - Study parameters including property details, assets, and rates
 * @returns Structured report with summary, breakdowns, and schedules
 */
export function generateStudyReport(input: StudyReportInput): StudyReport {
  const {
    propertyType,
    purchasePrice,
    buildingValue,
    taxRate,
    discountRate,
    bonusDepreciationRate,
    assets,
  } = input;

  const straightLinePeriod = getStraightLineRecoveryPeriod(propertyType);

  // -------------------------------------------------------------------------
  // 1. Asset breakdown
  // -------------------------------------------------------------------------

  const totalAssetValue = assets.reduce((sum, a) => sum + a.costBasis, 0);

  const assetBreakdown = assets.map((asset) => ({
    category: asset.category,
    amount: Math.round(asset.costBasis * 100) / 100,
    percentage:
      totalAssetValue > 0
        ? Math.round((asset.costBasis / totalAssetValue) * 10000) / 100
        : 0,
    recoveryPeriod: asset.recoveryPeriod,
  }));

  // -------------------------------------------------------------------------
  // 2. Accelerated depreciation (with cost seg) for each asset
  // -------------------------------------------------------------------------

  // Collect per-asset depreciation schedules (only depreciable assets)
  const assetSchedules: { year: number; depreciation: number }[][] = [];

  for (const asset of assets) {
    // Land (recoveryPeriod 0) is not depreciable
    if (asset.recoveryPeriod === 0) continue;

    if (!isValidRecoveryPeriod(asset.recoveryPeriod)) {
      // Skip assets with non-standard recovery periods
      continue;
    }

    const schedule = calculateDepreciation(
      asset.costBasis,
      asset.recoveryPeriod,
      bonusDepreciationRate
    );

    assetSchedules.push(
      schedule.map((entry) => ({
        year: entry.year,
        depreciation: entry.depreciation,
      }))
    );
  }

  // Merge all asset schedules into a single combined accelerated schedule
  const maxAcceleratedYears = assetSchedules.reduce(
    (max, s) => Math.max(max, s.length),
    0
  );

  const combinedAccelerated: { year: number; depreciation: number }[] = [];
  for (let y = 0; y < maxAcceleratedYears; y++) {
    let total = 0;
    for (const schedule of assetSchedules) {
      if (y < schedule.length) {
        total += schedule[y].depreciation;
      }
    }
    combinedAccelerated.push({
      year: y + 1,
      depreciation: Math.round(total * 100) / 100,
    });
  }

  // -------------------------------------------------------------------------
  // 3. Straight-line depreciation (without cost seg)
  // -------------------------------------------------------------------------

  // Without cost seg, the entire building value is depreciated at the
  // straight-line period (39yr or 27.5yr) with no bonus.
  const straightLineSchedule = calculateStraightLineDepreciation(
    buildingValue,
    straightLinePeriod
  );

  const straightLineEntries = straightLineSchedule.map((entry) => ({
    year: entry.year,
    depreciation: entry.depreciation,
  }));

  // -------------------------------------------------------------------------
  // 4. Tax savings comparison
  // -------------------------------------------------------------------------

  const taxSavingsEntries = calculateTaxSavings(
    combinedAccelerated,
    straightLineEntries,
    taxRate
  );

  const taxSavingsSchedule = taxSavingsEntries.map((entry) => ({
    year: entry.year,
    withCostSeg: entry.withCostSeg,
    withoutCostSeg: entry.withoutCostSeg,
    savings: entry.annualSavings,
    cumulativeSavings: entry.cumulativeSavings,
  }));

  // -------------------------------------------------------------------------
  // 5. NPV of tax savings
  // -------------------------------------------------------------------------

  const annualSavingsArray = taxSavingsEntries.map((e) => e.annualSavings);
  const npvTaxSavings = calculateNPV(annualSavingsArray, discountRate);

  // -------------------------------------------------------------------------
  // 6. Depreciation schedule comparison
  // -------------------------------------------------------------------------

  const maxScheduleYears = Math.max(
    combinedAccelerated.length,
    straightLineEntries.length
  );

  const depreciationSchedule: {
    year: number;
    accelerated: number;
    straightLine: number;
    difference: number;
  }[] = [];

  for (let y = 0; y < maxScheduleYears; y++) {
    const accelerated =
      y < combinedAccelerated.length ? combinedAccelerated[y].depreciation : 0;
    const straightLine =
      y < straightLineEntries.length ? straightLineEntries[y].depreciation : 0;
    const difference = Math.round((accelerated - straightLine) * 100) / 100;

    depreciationSchedule.push({
      year: y + 1,
      accelerated: Math.round(accelerated * 100) / 100,
      straightLine: Math.round(straightLine * 100) / 100,
      difference,
    });
  }

  // -------------------------------------------------------------------------
  // 7. First-year analysis
  // -------------------------------------------------------------------------

  let totalBonusDepreciation = 0;
  let totalRegularFirstYear = 0;

  for (const asset of assets) {
    if (asset.recoveryPeriod === 0) continue;
    if (!isValidRecoveryPeriod(asset.recoveryPeriod)) continue;

    const bonusResult = calculateBonusDepreciation(
      asset.costBasis,
      asset.recoveryPeriod,
      bonusDepreciationRate
    );

    totalBonusDepreciation += bonusResult.bonusAmount;

    // Regular first year MACRS on remaining basis
    const rates = getMacrsRates(asset.recoveryPeriod);
    const firstYearMacrs = bonusResult.remainingBasis * (rates[0] / 100);
    totalRegularFirstYear += firstYearMacrs;
  }

  totalBonusDepreciation = Math.round(totalBonusDepreciation * 100) / 100;
  totalRegularFirstYear = Math.round(totalRegularFirstYear * 100) / 100;

  const totalFirstYear = Math.round(
    (totalBonusDepreciation + totalRegularFirstYear) * 100
  ) / 100;

  const firstYearTaxSavings = Math.round(
    totalFirstYear * (taxRate / 100) * 100
  ) / 100;

  const firstYearAnalysis = {
    bonusDepreciation: totalBonusDepreciation,
    regularFirstYear: totalRegularFirstYear,
    totalFirstYear,
    taxSavings: firstYearTaxSavings,
  };

  // -------------------------------------------------------------------------
  // 8. Summary
  // -------------------------------------------------------------------------

  // Total reclassified = sum of assets NOT in the building class or land
  const buildingCategories = ['building_27_5yr', 'building_39yr', 'land'];
  const totalReclassified = Math.round(
    assets
      .filter((a) => !buildingCategories.includes(a.category))
      .reduce((sum, a) => sum + a.costBasis, 0) * 100
  ) / 100;

  const totalTaxSavings =
    taxSavingsSchedule.length > 0
      ? taxSavingsSchedule[taxSavingsSchedule.length - 1].cumulativeSavings
      : 0;

  // Effective rate: first-year tax savings as a percentage of purchase price
  const effectiveRate =
    purchasePrice > 0
      ? Math.round((firstYearTaxSavings / purchasePrice) * 10000) / 100
      : 0;

  const summary = {
    totalReclassified,
    totalFirstYearDeduction: totalFirstYear,
    totalTaxSavings,
    npvTaxSavings,
    effectiveRate,
  };

  return {
    summary,
    assetBreakdown,
    depreciationSchedule,
    taxSavingsSchedule,
    firstYearAnalysis,
  };
}
