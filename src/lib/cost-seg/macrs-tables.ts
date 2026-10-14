/**
 * MACRS Depreciation Rate Tables
 *
 * Official IRS percentage tables for the Modified Accelerated Cost Recovery System.
 * All rates are expressed as percentages (e.g., 20.00 = 20%).
 * Half-year convention is used for 5, 7, and 15-year property (mid-quarter
 * when IRC §168(d)(3) applies — see MACRS_MID_QUARTER).
 * Mid-month convention is used for 27.5 and 39-year property.
 */

export type MacrsRecoveryPeriod = 5 | 7 | 15 | 27.5 | 39;

/**
 * 5-Year Property (200% Declining Balance, Half-Year Convention)
 * Examples: Carpeting, appliances, task lighting, certain fixtures
 * 6 entries due to half-year convention in first and last year
 */
export const MACRS_5_YEAR: readonly number[] = [
  20.00, // Year 1
  32.00, // Year 2
  19.20, // Year 3
  11.52, // Year 4
  11.52, // Year 5
  5.76,  // Year 6
] as const;

/**
 * 7-Year Property (200% Declining Balance, Half-Year Convention)
 * Examples: Office furniture, cabinetry, security systems, signs
 * 8 entries due to half-year convention
 */
export const MACRS_7_YEAR: readonly number[] = [
  14.29, // Year 1
  24.49, // Year 2
  17.49, // Year 3
  12.49, // Year 4
  8.93,  // Year 5
  8.92,  // Year 6
  8.93,  // Year 7
  4.46,  // Year 8
] as const;

/**
 * 15-Year Property (150% Declining Balance, Half-Year Convention)
 * Examples: Land improvements, parking lots, landscaping, sidewalks, fencing
 * 16 entries due to half-year convention
 */
export const MACRS_15_YEAR: readonly number[] = [
  5.00,  // Year 1
  9.50,  // Year 2
  8.55,  // Year 3
  7.70,  // Year 4
  6.93,  // Year 5
  6.23,  // Year 6
  5.90,  // Year 7
  5.90,  // Year 8
  5.91,  // Year 9
  5.90,  // Year 10
  5.91,  // Year 11
  5.90,  // Year 12
  5.91,  // Year 13
  5.90,  // Year 14
  5.91,  // Year 15
  2.95,  // Year 16
] as const;

/**
 * 27.5-Year Residential Rental Property (Straight-Line, Mid-Month Convention)
 * Placed in service in Month 1. (IRS Pub 946, Table A-6, month 1 column.)
 * Year 1: 3.485% (mid-month: 11.5/12 * 3.636%)
 * Years 2-9: 3.636%
 * Years 10-26: alternating 3.637% / 3.636% (3.637% starting in year 10)
 * Year 27: 3.636%, Year 28: 1.970% (remaining basis)
 * Column sums to exactly 100.000%.
 */
export const MACRS_27_5_YEAR: readonly number[] = [
  3.485,  // Year 1  (mid-month: 11.5/12 * 3.636 ~ 3.485)
  3.636,  // Year 2
  3.636,  // Year 3
  3.636,  // Year 4
  3.636,  // Year 5
  3.636,  // Year 6
  3.636,  // Year 7
  3.636,  // Year 8
  3.636,  // Year 9
  3.637,  // Year 10
  3.636,  // Year 11
  3.637,  // Year 12
  3.636,  // Year 13
  3.637,  // Year 14
  3.636,  // Year 15
  3.637,  // Year 16
  3.636,  // Year 17
  3.637,  // Year 18
  3.636,  // Year 19
  3.637,  // Year 20
  3.636,  // Year 21
  3.637,  // Year 22
  3.636,  // Year 23
  3.637,  // Year 24
  3.636,  // Year 25
  3.637,  // Year 26
  3.636,  // Year 27
  1.970,  // Year 28 (remaining basis)
] as const;

/**
 * 39-Year Nonresidential Real Property (Straight-Line, Mid-Month Convention)
 * Placed in service in Month 1. (IRS Pub 946, Table A-7a, month 1 column.)
 * Year 1: 2.461% (mid-month for first year)
 * Years 2-39: 2.564%
 * Year 40: 0.107% (remaining basis)
 * Column sums to exactly 100.000%.
 */
export const MACRS_39_YEAR: readonly number[] = [
  2.461,  // Year 1  (mid-month adjustment)
  2.564,  // Year 2
  2.564,  // Year 3
  2.564,  // Year 4
  2.564,  // Year 5
  2.564,  // Year 6
  2.564,  // Year 7
  2.564,  // Year 8
  2.564,  // Year 9
  2.564,  // Year 10
  2.564,  // Year 11
  2.564,  // Year 12
  2.564,  // Year 13
  2.564,  // Year 14
  2.564,  // Year 15
  2.564,  // Year 16
  2.564,  // Year 17
  2.564,  // Year 18
  2.564,  // Year 19
  2.564,  // Year 20
  2.564,  // Year 21
  2.564,  // Year 22
  2.564,  // Year 23
  2.564,  // Year 24
  2.564,  // Year 25
  2.564,  // Year 26
  2.564,  // Year 27
  2.564,  // Year 28
  2.564,  // Year 29
  2.564,  // Year 30
  2.564,  // Year 31
  2.564,  // Year 32
  2.564,  // Year 33
  2.564,  // Year 34
  2.564,  // Year 35
  2.564,  // Year 36
  2.564,  // Year 37
  2.564,  // Year 38
  2.564,  // Year 39
  0.107,  // Year 40 (remaining basis)
] as const;

/**
 * Real-property first-year rates by placed-in-service month (IRS Pub 946,
 * Table A-6 for 27.5-year and Table A-7a for 39-year, mid-month convention).
 * Index 0 = January ... index 11 = December.
 */
const FIRST_YEAR_27_5: readonly number[] = [
  3.485, 3.182, 2.879, 2.576, 2.273, 1.970, 1.667, 1.364, 1.061, 0.758, 0.455, 0.152,
];
const FIRST_YEAR_39: readonly number[] = [
  2.461, 2.247, 2.033, 1.819, 1.605, 1.391, 1.177, 0.963, 0.749, 0.535, 0.321, 0.107,
];

/**
 * 27.5-year rates for a given placed-in-service month (Pub 946 Table A-6).
 *
 * Years 2-9 are 3.636% for every month. Years 10-27 alternate
 * 3.637/3.636 — starting with 3.637 in year 10 for months 1-6, and with
 * 3.636 for months 7-12. Months 1-6 finish in year 28; months 7-12 take a
 * full 3.636% in year 28 and finish in year 29. Every column sums to 100%.
 */
function build27_5YearTable(month: number): number[] {
  const firstHalf = month <= 6;
  const rates: number[] = [FIRST_YEAR_27_5[month - 1]];
  for (let year = 2; year <= 9; year++) rates.push(3.636);
  for (let year = 10; year <= 27; year++) {
    const even = year % 2 === 0;
    rates.push(firstHalf === even ? 3.637 : 3.636);
  }
  if (firstHalf) {
    // Year 28 remainder: 1.970, 2.273, 2.576, 2.879, 3.182, 3.485
    rates.push(round3(1.970 + (month - 1) * 0.303));
  } else {
    rates.push(3.636);
    // Year 29 remainder: 0.152, 0.455, 0.758, 1.061, 1.364, 1.667
    rates.push(round3(0.152 + (month - 7) * 0.303));
  }
  return rates;
}

/**
 * 39-year rates for a given placed-in-service month (Pub 946 Table A-7a).
 * Years 2-39 are 2.564% for every month; year 40 is the remainder
 * (0.107% for January ... 2.461% for December).
 */
function build39YearTable(month: number): number[] {
  const rates: number[] = [FIRST_YEAR_39[month - 1]];
  for (let year = 2; year <= 39; year++) rates.push(2.564);
  rates.push(FIRST_YEAR_39[12 - month]);
  return rates;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Quarter of the (calendar) tax year in which property was placed in service. */
export type PlacedInServiceQuarter = 1 | 2 | 3 | 4;

/**
 * Mid-quarter convention rates for 5/7/15-year property (IRC §168(d)(3)),
 * keyed by recovery period, then by the quarter placed in service. IRS Pub
 * 946 Tables A-2 (Q1), A-3 (Q2), A-4 (Q3) and A-5 (Q4): GDS 200% declining
 * balance for 5/7-year and 150% DB for 15-year, switching to straight line.
 *
 * Year 1 gets (quarters remaining - 0.5) / 4 of a full year: 87.5% (Q1),
 * 62.5% (Q2), 37.5% (Q3), 12.5% (Q4). Each column sums to exactly 100%.
 */
export const MACRS_MID_QUARTER: Readonly<
  Record<5 | 7 | 15, Readonly<Record<PlacedInServiceQuarter, readonly number[]>>>
> = {
  5: {
    1: [35.00, 26.00, 15.60, 11.01, 11.01, 1.38],
    2: [25.00, 30.00, 18.00, 11.37, 11.37, 4.26],
    3: [15.00, 34.00, 20.40, 12.24, 11.30, 7.06],
    4: [5.00, 38.00, 22.80, 13.68, 10.94, 9.58],
  },
  7: {
    1: [25.00, 21.43, 15.31, 10.93, 8.75, 8.74, 8.75, 1.09],
    // As printed in Pub 946 (17.85, column sums to 99.99); the final-year
    // true-up in calculateDepreciation still recovers the full basis.
    2: [17.85, 23.47, 16.76, 11.97, 8.87, 8.87, 8.87, 3.33],
    3: [10.71, 25.51, 18.22, 13.02, 9.30, 8.85, 8.86, 5.53],
    4: [3.57, 27.55, 19.68, 14.06, 10.04, 8.73, 8.73, 7.64],
  },
  15: {
    1: [8.75, 9.13, 8.21, 7.39, 6.65, 5.99, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 0.74],
    2: [6.25, 9.38, 8.44, 7.59, 6.83, 6.15, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 2.21],
    3: [3.75, 9.63, 8.66, 7.80, 7.02, 6.31, 5.90, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 3.69],
    4: [1.25, 9.88, 8.89, 8.00, 7.20, 6.48, 5.90, 5.90, 5.90, 5.91, 5.90, 5.91, 5.90, 5.91, 5.90, 5.17],
  },
};

/** Normalise a placed-in-service month to 1-12 (invalid values become 1). */
function normaliseMonth(month: number): number {
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1;
}

/** Quarter (1-4) of a placed-in-service month (1-12) in a calendar tax year. */
export function quarterForMonth(month: number): PlacedInServiceQuarter {
  return Math.ceil(normaliseMonth(month) / 3) as PlacedInServiceQuarter;
}

/**
 * Map of recovery periods to their MACRS rate tables
 */
const MACRS_TABLES: Record<MacrsRecoveryPeriod, readonly number[]> = {
  5: MACRS_5_YEAR,
  7: MACRS_7_YEAR,
  15: MACRS_15_YEAR,
  27.5: MACRS_27_5_YEAR,
  39: MACRS_39_YEAR,
};

/**
 * Returns the MACRS depreciation rate table for the given recovery period.
 *
 * 5/7/15-year property uses the half-year convention, so the
 * placed-in-service month does not matter — unless the mid-quarter
 * convention applies, in which case the table for the quarter of the
 * placed-in-service month is used. 27.5/39-year real property always uses
 * the mid-month convention, so the first-year (and final-year) rate depends
 * on the month the property was placed in service.
 *
 * @param period - The MACRS recovery period (5, 7, 15, 27.5, or 39 years)
 * @param placedInServiceMonth - 1 (January) through 12 (December); default 1.
 *   Affects 27.5/39-year property, and 5/7/15-year property under the
 *   mid-quarter convention. Invalid values fall back to 1.
 * @param midQuarter - Apply the mid-quarter convention to 5/7/15-year
 *   property (IRC §168(d)(3)); default false (half-year convention).
 * @returns Array of annual depreciation percentages
 * @throws Error if an invalid recovery period is provided
 */
export function getMacrsRates(
  period: MacrsRecoveryPeriod,
  placedInServiceMonth: number = 1,
  midQuarter: boolean = false
): number[] {
  const rates = MACRS_TABLES[period];
  if (!rates) {
    throw new Error(
      `Invalid MACRS recovery period: ${period}. Valid periods are: ${Object.keys(MACRS_TABLES).join(', ')}`
    );
  }
  const month = normaliseMonth(placedInServiceMonth);
  if (midQuarter && (period === 5 || period === 7 || period === 15)) {
    return [...MACRS_MID_QUARTER[period][quarterForMonth(month)]];
  }
  if (period === 27.5 && month !== 1) return build27_5YearTable(month);
  if (period === 39 && month !== 1) return build39YearTable(month);
  return [...rates];
}
