/**
 * MACRS Depreciation Rate Tables
 *
 * Official IRS percentage tables for the Modified Accelerated Cost Recovery System.
 * All rates are expressed as percentages (e.g., 20.00 = 20%).
 * Half-year convention is used for 5, 7, and 15-year property.
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
 * Placed in service in Month 1.
 * Years 1-27 get ~3.636%, Year 28 gets the remainder (~1.97%).
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
  3.636,  // Year 10
  3.636,  // Year 11
  3.636,  // Year 12
  3.636,  // Year 13
  3.636,  // Year 14
  3.636,  // Year 15
  3.636,  // Year 16
  3.636,  // Year 17
  3.636,  // Year 18
  3.636,  // Year 19
  3.636,  // Year 20
  3.636,  // Year 21
  3.636,  // Year 22
  3.636,  // Year 23
  3.636,  // Year 24
  3.636,  // Year 25
  3.636,  // Year 26
  3.636,  // Year 27
  1.970,  // Year 28 (remaining basis)
] as const;

/**
 * 39-Year Nonresidential Real Property (Straight-Line, Mid-Month Convention)
 * Placed in service in Month 1.
 * Year 1: 2.4610% (mid-month for first year)
 * Years 2-39: 2.5641%
 * Year 40: 1.0684% (remaining basis)
 */
export const MACRS_39_YEAR: readonly number[] = [
  2.4610,  // Year 1  (mid-month adjustment)
  2.5641,  // Year 2
  2.5641,  // Year 3
  2.5641,  // Year 4
  2.5641,  // Year 5
  2.5641,  // Year 6
  2.5641,  // Year 7
  2.5641,  // Year 8
  2.5641,  // Year 9
  2.5641,  // Year 10
  2.5641,  // Year 11
  2.5641,  // Year 12
  2.5641,  // Year 13
  2.5641,  // Year 14
  2.5641,  // Year 15
  2.5641,  // Year 16
  2.5641,  // Year 17
  2.5641,  // Year 18
  2.5641,  // Year 19
  2.5641,  // Year 20
  2.5641,  // Year 21
  2.5641,  // Year 22
  2.5641,  // Year 23
  2.5641,  // Year 24
  2.5641,  // Year 25
  2.5641,  // Year 26
  2.5641,  // Year 27
  2.5641,  // Year 28
  2.5641,  // Year 29
  2.5641,  // Year 30
  2.5641,  // Year 31
  2.5641,  // Year 32
  2.5641,  // Year 33
  2.5641,  // Year 34
  2.5641,  // Year 35
  2.5641,  // Year 36
  2.5641,  // Year 37
  2.5641,  // Year 38
  2.5641,  // Year 39
  1.0684,  // Year 40 (remaining basis)
] as const;

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
 * @param period - The MACRS recovery period (5, 7, 15, 27.5, or 39 years)
 * @returns Array of annual depreciation percentages
 * @throws Error if an invalid recovery period is provided
 */
export function getMacrsRates(period: MacrsRecoveryPeriod): number[] {
  const rates = MACRS_TABLES[period];
  if (!rates) {
    throw new Error(
      `Invalid MACRS recovery period: ${period}. Valid periods are: ${Object.keys(MACRS_TABLES).join(', ')}`
    );
  }
  return [...rates];
}
