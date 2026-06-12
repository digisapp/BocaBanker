/**
 * Tax Savings Calculator
 *
 * Compares accelerated depreciation (with cost segregation) against
 * straight-line depreciation to quantify annual and cumulative tax savings.
 */

export interface TaxSavingsEntry {
  year: number;
  withCostSeg: number;
  withoutCostSeg: number;
  annualSavings: number;
  cumulativeSavings: number;
}

/**
 * Calculates the year-by-year tax savings from cost segregation.
 *
 * Compares the accelerated depreciation schedule (with cost seg and bonus)
 * against a straight-line depreciation schedule (without cost seg) to determine
 * the net present tax benefit of performing a cost segregation study.
 *
 * Note: This calculates the timing benefit of accelerated depreciation.
 * Total depreciation over the full life of the asset remains the same;
 * cost segregation shifts deductions into earlier years.
 *
 * @param depreciationSchedule - Accelerated depreciation schedule (with cost seg)
 * @param straightLineSchedule - Straight-line depreciation schedule (without cost seg)
 * @param taxRate - Marginal tax rate as a percentage (e.g., 37 for 37%)
 * @returns Array of yearly tax savings entries with cumulative tracking
 */
export function calculateTaxSavings(
  depreciationSchedule: { year: number; depreciation: number }[],
  straightLineSchedule: { year: number; depreciation: number }[],
  taxRate: number
): TaxSavingsEntry[] {
  const rate = taxRate / 100;

  // Index each schedule by its year field (summing any duplicate years) so
  // that entries are matched on year rather than array position.
  const buildYearMap = (
    schedule: { year: number; depreciation: number }[]
  ): Map<number, number> => {
    const map = new Map<number, number>();
    for (const entry of schedule) {
      map.set(entry.year, (map.get(entry.year) ?? 0) + entry.depreciation);
    }
    return map;
  };

  const acceleratedByYear = buildYearMap(depreciationSchedule);
  const straightLineByYear = buildYearMap(straightLineSchedule);

  // Cover every year from 1 through the latest year in either schedule
  const maxYears = Math.max(
    0,
    ...acceleratedByYear.keys(),
    ...straightLineByYear.keys()
  );

  const results: TaxSavingsEntry[] = [];
  let cumulativeSavings = 0;

  for (let i = 0; i < maxYears; i++) {
    const yearNumber = i + 1;

    // Get depreciation for this year from each schedule, defaulting to 0
    const acceleratedDep = acceleratedByYear.get(yearNumber) ?? 0;
    const straightLineDep = straightLineByYear.get(yearNumber) ?? 0;

    // Tax savings = depreciation * tax rate
    const withCostSeg = Math.round(acceleratedDep * rate * 100) / 100;
    const withoutCostSeg = Math.round(straightLineDep * rate * 100) / 100;
    const annualSavings = Math.round((withCostSeg - withoutCostSeg) * 100) / 100;

    cumulativeSavings = Math.round((cumulativeSavings + annualSavings) * 100) / 100;

    results.push({
      year: yearNumber,
      withCostSeg,
      withoutCostSeg,
      annualSavings,
      cumulativeSavings,
    });
  }

  return results;
}
