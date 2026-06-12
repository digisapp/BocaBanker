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
 * Section 168(k) bonus depreciation rate by placed-in-service year.
 *
 * TCJA phase-down: 100% through 2022, 80% in 2023, 60% in 2024.
 * The One Big Beautiful Bill Act (July 2025) restored permanent 100% bonus
 * for property acquired after January 19, 2025 — treated here as 100% for
 * all of 2025+ as a practical simplification.
 */
export function getBonusRateForYear(placedInService: Date | number): number {
  const year =
    typeof placedInService === 'number'
      ? placedInService
      : placedInService.getFullYear();

  if (year <= 2022) return 100;
  if (year === 2023) return 80;
  if (year === 2024) return 60;
  return 100; // 2025+ under OBBBA
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
 * @returns Object with bonus amount, remaining basis, and total first-year deduction
 */
export function calculateBonusDepreciation(
  costBasis: number,
  recoveryPeriod: MacrsRecoveryPeriod,
  bonusRate: number = 100
): BonusDepreciationResult {
  if (costBasis <= 0) {
    return {
      bonusAmount: 0,
      remainingBasis: 0,
      firstYearTotal: 0,
    };
  }

  const isEligible = recoveryPeriod <= BONUS_ELIGIBLE_MAX_PERIOD;

  // Clamp so bad stored values (e.g. 150) can't produce a negative basis
  const clampedRate = Math.min(100, Math.max(0, bonusRate));

  // Calculate bonus depreciation
  const bonusAmount = isEligible
    ? Math.round(costBasis * (clampedRate / 100) * 100) / 100
    : 0;

  const remainingBasis = Math.round((costBasis - bonusAmount) * 100) / 100;

  // Get the first-year MACRS rate for the remaining basis
  const rates = getMacrsRates(recoveryPeriod);
  const firstYearMacrsRate = rates[0] / 100;
  const firstYearMacrs = Math.round(remainingBasis * firstYearMacrsRate * 100) / 100;

  const firstYearTotal = Math.round((bonusAmount + firstYearMacrs) * 100) / 100;

  return {
    bonusAmount,
    remainingBasis,
    firstYearTotal,
  };
}
