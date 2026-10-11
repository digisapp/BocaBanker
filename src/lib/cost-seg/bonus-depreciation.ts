/**
 * Bonus Depreciation Calculator
 *
 * Calculates first-year bonus depreciation for eligible assets under
 * Section 168(k) of the Internal Revenue Code.
 *
 * Bonus depreciation allows an immediate deduction of a percentage of the
 * cost of qualifying assets in the year they are placed in service.
 */

import { getMacrsRates, type MacrsRecoveryPeriod } from './macrs-tables';

export interface BonusDepreciationResult {
  /** The bonus depreciation amount taken in year 1 */
  bonusAmount: number;
  /** The remaining depreciable basis after bonus */
  remainingBasis: number;
  /** Total first-year deduction (bonus + first-year MACRS on remaining basis) */
  firstYearTotal: number;
}

/**
 * Maximum recovery period eligible for bonus depreciation.
 * Under Section 168(k), assets with a recovery period of 20 years or less qualify.
 */
const BONUS_ELIGIBLE_MAX_PERIOD = 20;

// Acquisition-date cutovers for each Section 168(k) regime (first qualifying day)
// One Big Beautiful Bill Act: acquired after January 19, 2025
const OBBBA_ACQUIRED_AFTER = Date.UTC(2025, 0, 20); // 2025-01-20
// TCJA: acquired after September 27, 2017
const TCJA_ACQUIRED_AFTER = Date.UTC(2017, 8, 28); // 2017-09-28
// Tax Relief Act of 2010: acquired after September 8, 2010
const TRA_2010_ACQUIRED_AFTER = Date.UTC(2010, 8, 9); // 2010-09-09
// Economic Stimulus Act of 2008 (and its extensions): acquired after 2007
const ESA_2008_ACQUIRED_AFTER = Date.UTC(2008, 0, 1); // 2008-01-01
// JGTRRA 50%: acquired after May 5, 2003
const JGTRRA_ACQUIRED_AFTER = Date.UTC(2003, 4, 6); // 2003-05-06
// JCWAA 30%: acquired after September 10, 2001
const JCWAA_ACQUIRED_AFTER = Date.UTC(2001, 8, 11); // 2001-09-11

/** TCJA phase-down (Section 168(k)(6)) by placed-in-service year. */
const TCJA_PHASE_DOWN: Record<number, number> = { 2023: 80, 2024: 60, 2025: 40, 2026: 20 };

function toYear(d: Date | number): number {
  return typeof d === 'number' ? d : d.getFullYear();
}

/**
 * Section 168(k) bonus depreciation rate for property placed in service in
 * the given year, following the law in effect for that year:
 *
 * - Before 2001, and 2005-2007: no bonus (0%).
 * - 2001-2004: 30% if acquired after Sept 10, 2001; 50% if acquired after
 *   May 5, 2003.
 * - 2008-2017: 50%, or 100% if acquired after Sept 8, 2010 and placed in
 *   service by the end of 2011. Property acquired before 2008 gets 0%.
 * - Acquired after Sept 27, 2017 (TCJA): 100% through 2022, then 80% 2023,
 *   60% 2024, 40% 2025, 20% 2026, 0% 2027+. Property acquired before
 *   Sept 28, 2017 keeps the PATH Act rates: 50% 2017, 40% 2018, 30% 2019,
 *   0% after.
 * - Acquired after January 19, 2025 (One Big Beautiful Bill Act): permanent
 *   100%.
 *
 * When no acquisition date is supplied, the regime that covers most of the
 * placed-in-service year is assumed: 2017 = 50% (TCJA began Sept 28), 2010 =
 * 50%, 2011 = 100%, 2018-2022 = 100%, 2025+ = 100% (OBBBA). Pass the
 * acquisition (binding-contract) date for the exact rate — e.g. acquired
 * Dec 2024, placed in service 2025 = 40%.
 *
 * @param placedInService - Placed-in-service date or year (only the year is used)
 * @param acquired - Optional acquisition date (Date, or 'YYYY-MM-DD' string)
 */
export function getBonusRateForYear(
  placedInService: Date | number,
  acquired?: Date | string | null
): number {
  const year = toYear(placedInService);

  let acquiredTime: number | null = null;
  if (acquired) {
    const t =
      typeof acquired === 'string'
        ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(acquired) ? `${acquired}T00:00:00Z` : acquired)
        : Date.UTC(acquired.getFullYear(), acquired.getMonth(), acquired.getDate());
    if (Number.isFinite(t)) acquiredTime = t;
  }

  // Was the property acquired on/after `cutoff`? `ifUnknown` answers when
  // there's no acquisition date.
  const acquiredOnOrAfter = (cutoff: number, ifUnknown: boolean) =>
    acquiredTime === null ? ifUnknown : acquiredTime >= cutoff;

  if (year >= 2025 && acquiredOnOrAfter(OBBBA_ACQUIRED_AFTER, true)) return 100;

  if (year >= 2017 && acquiredOnOrAfter(TCJA_ACQUIRED_AFTER, year >= 2018)) {
    return year <= 2022 ? 100 : (TCJA_PHASE_DOWN[year] ?? 0);
  }

  // 50% from the Economic Stimulus Act of 2008 through the PATH Act, which
  // also governs property acquired before Sept 28, 2017 (phased down to 0%
  // after 2019).
  if (year >= 2008) {
    if (!acquiredOnOrAfter(ESA_2008_ACQUIRED_AFTER, true)) return 0;
    if ((year === 2010 || year === 2011) && acquiredOnOrAfter(TRA_2010_ACQUIRED_AFTER, year === 2011)) {
      return 100;
    }
    if (year <= 2017) return 50;
    if (year === 2018) return 40;
    if (year === 2019) return 30;
    return 0;
  }

  // Bonus depreciation lapsed for property placed in service 2005-2007
  if (year >= 2005 || year < 2001) return 0;

  // 2001-2004 (JCWAA 30%, raised to 50% by JGTRRA)
  if (acquiredOnOrAfter(JGTRRA_ACQUIRED_AFTER, year >= 2003)) return 50;
  if (acquiredOnOrAfter(JCWAA_ACQUIRED_AFTER, year >= 2002)) return 30;
  return 0;
}

/**
 * Calculates bonus depreciation and the total first-year deduction for an asset.
 *
 * Assets with a MACRS recovery period of 20 years or less are eligible for
 * bonus depreciation. The bonus amount is deducted in year 1, and the remaining
 * basis is depreciated using standard MACRS rates over the recovery period.
 *
 * @param costBasis - The depreciable cost basis of the asset
 * @param recoveryPeriod - The MACRS recovery period (5, 7, 15, 27.5, or 39)
 * @param bonusRate - Bonus depreciation rate as a percentage (0-100), default 100
 * @param placedInServiceMonth - 1-12; mid-month column for 27.5/39-year property,
 *   and the quarter under the mid-quarter convention (default 1)
 * @param midQuarter - Use the mid-quarter convention for 5/7/15-year property (default false)
 * @returns Object with bonus amount, remaining basis, and total first-year deduction
 */
export function calculateBonusDepreciation(
  costBasis: number,
  recoveryPeriod: MacrsRecoveryPeriod,
  bonusRate: number = 100,
  placedInServiceMonth: number = 1,
  midQuarter: boolean = false
): BonusDepreciationResult {
  if (!Number.isFinite(costBasis) || costBasis <= 0) {
    return {
      bonusAmount: 0,
      remainingBasis: 0,
      firstYearTotal: 0,
    };
  }

  const isEligible = recoveryPeriod <= BONUS_ELIGIBLE_MAX_PERIOD;

  // Clamp so bad stored values (e.g. 150) can't produce a negative basis
  const clampedRate = Number.isFinite(bonusRate) ? Math.min(100, Math.max(0, bonusRate)) : 0;

  // Calculate bonus depreciation
  const bonusAmount = isEligible
    ? Math.round(costBasis * (clampedRate / 100) * 100) / 100
    : 0;

  const remainingBasis = Math.round((costBasis - bonusAmount) * 100) / 100;

  // Get the first-year MACRS rate for the remaining basis
  const rates = getMacrsRates(recoveryPeriod, placedInServiceMonth, midQuarter);
  const firstYearMacrsRate = rates[0] / 100;
  const firstYearMacrs = Math.round(remainingBasis * firstYearMacrsRate * 100) / 100;

  const firstYearTotal = Math.round((bonusAmount + firstYearMacrs) * 100) / 100;

  return {
    bonusAmount,
    remainingBasis,
    firstYearTotal,
  };
}
