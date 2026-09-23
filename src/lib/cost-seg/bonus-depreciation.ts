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

/**
 * Date (inclusive) from which OBBBA's permanent 100% bonus applies:
 * property acquired after January 19, 2025.
 */
const OBBBA_ACQUIRED_AFTER = Date.UTC(2025, 0, 20); // 2025-01-20

function toYear(d: Date | number): number {
  return typeof d === 'number' ? d : d.getFullYear();
}

/**
 * Section 168(k) bonus depreciation rate.
 *
 * - Property acquired after January 19, 2025 (One Big Beautiful Bill Act):
 *   permanent 100%.
 * - Otherwise the TCJA phase-down by placed-in-service year applies:
 *   100% through 2022, 80% 2023, 60% 2024, 40% 2025, 20% 2026, 0% 2027+.
 *
 * When no acquisition date is supplied, property placed in service in 2025+
 * is assumed to have been acquired after January 19, 2025 (100%). Pass the
 * acquisition (binding-contract) date to get the TCJA rate for property
 * acquired earlier — e.g. acquired Dec 2024, placed in service 2025 = 40%.
 *
 * @param placedInService - Placed-in-service date or year
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

  const obbbaEligible =
    year >= 2025 && (acquiredTime === null || acquiredTime >= OBBBA_ACQUIRED_AFTER);
  if (obbbaEligible) return 100;

  // TCJA phase-down (Section 168(k)(6)) by placed-in-service year
  if (year <= 2022) return 100;
  if (year === 2023) return 80;
  if (year === 2024) return 60;
  if (year === 2025) return 40;
  if (year === 2026) return 20;
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
 * @param placedInServiceMonth - 1-12; mid-month column for 27.5/39-year property (default 1)
 * @returns Object with bonus amount, remaining basis, and total first-year deduction
 */
export function calculateBonusDepreciation(
  costBasis: number,
  recoveryPeriod: MacrsRecoveryPeriod,
  bonusRate: number = 100,
  placedInServiceMonth: number = 1
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
  const rates = getMacrsRates(recoveryPeriod, placedInServiceMonth);
  const firstYearMacrsRate = rates[0] / 100;
  const firstYearMacrs = Math.round(remainingBasis * firstYearMacrsRate * 100) / 100;

  const firstYearTotal = Math.round((bonusAmount + firstYearMacrs) * 100) / 100;

  return {
    bonusAmount,
    remainingBasis,
    firstYearTotal,
  };
}
