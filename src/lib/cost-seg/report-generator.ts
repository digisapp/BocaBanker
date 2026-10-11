/**
 * Cost Segregation Study Report Generator
 *
 * Composes results from all calculation modules to produce a comprehensive
 * cost segregation study report with depreciation schedules, tax savings,
 * and NPV analysis.
 */

import { calculateBonusDepreciation } from './bonus-depreciation';
import { calculateDepreciation, calculateStraightLineDepreciation } from './depreciation';
import type { StudyAssumptions } from './conventions';
import { type MacrsRecoveryPeriod, getMacrsRates, quarterForMonth } from './macrs-tables';
import { calculateNPV } from './npv';
import { calculateTaxSavings } from './tax-savings';

// ---------------------------------------------------------------------------
// Input / Output interfaces
// ---------------------------------------------------------------------------

export interface StudyReportInput {
  propertyAddress: string;
  propertyType: string;
  purchasePrice: number;
  /**
   * Depreciable building value for the straight-line baseline. Pass 0 when
   * unknown: the baseline then uses the depreciable basis of the assets.
   */
  buildingValue: number;
  landValue: number;
  /** Tax year the property was placed in service (year 1 of the schedules) */
  studyYear: number;
  taxRate: number;
  discountRate: number;
  bonusDepreciationRate: number;
  /**
   * Month (1-12) the property was placed in service. Selects the mid-month
   * convention column for 27.5/39-year property (IRS Pub 946 Tables A-6 /
   * A-7a). Defaults to 1 (January) when omitted.
   */
  placedInServiceMonth?: number;
  /**
   * Apply the mid-quarter convention (IRC §168(d)(3)) to 5/7/15-year
   * property: the quarter of `placedInServiceMonth` picks the IRS Pub 946
   * Table A-2..A-5 column. Real property keeps mid-month. Default false
   * (half-year convention).
   */
  midQuarterConvention?: boolean;
  assets: { category: string; costBasis: number; recoveryPeriod: number }[];
}

export interface StudyReport {
  summary: {
    totalReclassified: number;
    totalFirstYearDeduction: number;
    /** Peak cumulative savings vs. straight-line (the maximum timing benefit) */
    totalTaxSavings: number;
    npvTaxSavings: number;
    /** Year-1 tax savings vs. straight-line as a % of purchase price */
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
    /** Year-1 tax savings vs. straight-line (same as taxSavingsSchedule[0].savings) */
    taxSavings: number;
  };
  /** Conventions the schedules were computed with (year 1 = placedInServiceYear) */
  assumptions: StudyAssumptions;
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
  const rawMonth = input.placedInServiceMonth ?? 1;
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : 1;
  const midQuarter = input.midQuarterConvention === true;

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

  // Silently excluding an asset would understate the accelerated schedule
  // while the straight-line baseline still includes its basis — wildly wrong
  // savings. Reject invalid recovery periods loudly instead.
  const invalidAssets = assets.filter(
    (a) => a.recoveryPeriod !== 0 && !isValidRecoveryPeriod(a.recoveryPeriod)
  );
  if (invalidAssets.length > 0) {
    throw new Error(
      `Invalid recovery period(s): ${invalidAssets
        .map((a) => `${a.category}=${a.recoveryPeriod}`)
        .join(', ')}. Valid MACRS periods are 5, 7, 15, 27.5, 39 (0 for land).`
    );
  }

  const depreciableBasis = assets
    .filter((a) => a.recoveryPeriod !== 0)
    .reduce((sum, a) => sum + a.costBasis, 0);

  // The "without cost seg" baseline depreciates the building value. With no
  // building value on record, the assets were allocated from the purchase
  // price (minus land), so the baseline uses that same depreciable basis —
  // an empty baseline would count every dollar of depreciation as savings.
  const hasBuildingValue = Number.isFinite(buildingValue) && buildingValue > 0;
  const baselineBasis = hasBuildingValue ? buildingValue : depreciableBasis;

  // Flag basis mismatches: savings should come from timing, not from the
  // asset bases simply not summing to the building value (or, without one,
  // from the assets not adding up to the purchase price).
  if (hasBuildingValue) {
    if (Math.abs(depreciableBasis - buildingValue) / buildingValue > 0.01) {
      console.warn(
        `[report-generator] Depreciable asset basis ($${depreciableBasis.toFixed(2)}) ` +
          `differs from building value ($${buildingValue.toFixed(2)}) by more than 1% — ` +
          `savings will include spurious basis differences.`
      );
    }
  } else if (purchasePrice > 0 && Math.abs(totalAssetValue - purchasePrice) / purchasePrice > 0.01) {
    console.warn(
      `[report-generator] No building value on record and the assets ($${totalAssetValue.toFixed(2)}) ` +
        `differ from the purchase price ($${purchasePrice.toFixed(2)}) by more than 1% — ` +
        `the straight-line baseline uses the depreciable asset basis ($${depreciableBasis.toFixed(2)}).`
    );
  }

  for (const asset of assets) {
    // Land (recoveryPeriod 0) is not depreciable
    if (asset.recoveryPeriod === 0) continue;
    // unreachable after the throw above; narrows the type for TS
    if (!isValidRecoveryPeriod(asset.recoveryPeriod)) continue;

    const schedule = calculateDepreciation(
      asset.costBasis,
      asset.recoveryPeriod,
      bonusDepreciationRate,
      month,
      midQuarter
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

  // Without cost seg, the entire building basis is depreciated at the
  // straight-line period (39yr or 27.5yr) with no bonus.
  const straightLineSchedule = calculateStraightLineDepreciation(
    baselineBasis,
    straightLinePeriod,
    month
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
      bonusDepreciationRate,
      month,
      midQuarter
    );

    totalBonusDepreciation += bonusResult.bonusAmount;

    // Regular first year MACRS on remaining basis
    const rates = getMacrsRates(asset.recoveryPeriod, month, midQuarter);
    const firstYearMacrs = bonusResult.remainingBasis * (rates[0] / 100);
    totalRegularFirstYear += firstYearMacrs;
  }

  totalBonusDepreciation = Math.round(totalBonusDepreciation * 100) / 100;
  totalRegularFirstYear = Math.round(totalRegularFirstYear * 100) / 100;

  const totalFirstYear = Math.round(
    (totalBonusDepreciation + totalRegularFirstYear) * 100
  ) / 100;

  // Year-1 savings versus the straight-line baseline (not the gross tax value
  // of the year-1 deduction, which ignores the depreciation you'd get anyway)
  const firstYearTaxSavings = taxSavingsSchedule.length > 0 ? taxSavingsSchedule[0].savings : 0;

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

  // Cost seg is a timing benefit: lifetime cumulative savings nets to ~zero,
  // so the headline "total savings" is the PEAK cumulative savings over the
  // schedule (matching the calculators), not the final-year value.
  const totalTaxSavings = taxSavingsSchedule.reduce(
    (max, entry) => Math.max(max, entry.cumulativeSavings),
    0
  );

  // Effective rate: first-year tax savings (vs. baseline) as a percentage of purchase price
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

  const assumptions: StudyAssumptions = {
    placedInServiceYear: input.studyYear,
    placedInServiceMonth: month,
    placedInServiceQuarter: quarterForMonth(month),
    midQuarterConvention: midQuarter,
  };

  return {
    summary,
    assetBreakdown,
    depreciationSchedule,
    taxSavingsSchedule,
    firstYearAnalysis,
    assumptions,
  };
}
