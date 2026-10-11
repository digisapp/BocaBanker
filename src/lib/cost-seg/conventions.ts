/**
 * Depreciation conventions a study report was computed with, and how to
 * describe them in the results, printable report and export.
 */

import type { PlacedInServiceQuarter } from './macrs-tables';

export interface StudyAssumptions {
  /** Tax year placed in service (year 1 of the schedules) */
  placedInServiceYear: number;
  /** 1-12; selects the mid-month column (and the quarter under mid-quarter) */
  placedInServiceMonth: number;
  placedInServiceQuarter: PlacedInServiceQuarter;
  /** Mid-quarter (true) or half-year (false) convention for 5/7/15-year property */
  midQuarterConvention: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * e.g. "Mid-quarter (Q4, placed in service November 2025) for 5/7/15-year
 * property; mid-month for real property". Results calculated before the
 * assumptions were recorded always used the half-year convention.
 */
export function conventionLabel(assumptions?: StudyAssumptions | null): string {
  const realProperty = 'mid-month for real property';
  if (!assumptions?.midQuarterConvention) {
    return `Half-year for 5/7/15-year property; ${realProperty}`;
  }
  const month = MONTHS[assumptions.placedInServiceMonth - 1] ?? MONTHS[0];
  return (
    `Mid-quarter (Q${assumptions.placedInServiceQuarter}, placed in service ` +
    `${month} ${assumptions.placedInServiceYear}) for 5/7/15-year property; ${realProperty}`
  );
}
