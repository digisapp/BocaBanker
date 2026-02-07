/**
 * MACRS Depreciation Schedule Calculator
 *
 * Calculates year-by-year depreciation schedules using IRS MACRS tables,
 * with support for bonus depreciation on eligible assets.
 */

import { getMacrsRates, type MacrsRecoveryPeriod } from './macrs-tables';

export interface DepreciationEntry {
  year: number;
  depreciation: number;
  cumulativeDepreciation: number;
  remainingBasis: number;
}

/**
 * Maximum recovery period eligible for bonus depreciation.
 * Assets with recovery periods of 20 years or less qualify.
 */
const BONUS_ELIGIBLE_MAX_PERIOD = 20;

/**
 * Calculates a full MACRS depreciation schedule for an asset.
 *
 * Applies bonus depreciation in year 1 for eligible assets (recovery period <= 20 years),
 * then applies standard MACRS rates to the remaining basis.
 *
 * @param costBasis - The depreciable cost basis of the asset
 * @param recoveryPeriod - The MACRS recovery period (5, 7, 15, 27.5, or 39)
 * @param bonusDepreciationRate - Bonus depreciation rate as a percentage (0-100), default 100
 * @returns Array of yearly depreciation entries with cumulative tracking
 */
export function calculateDepreciation(
  costBasis: number,
  recoveryPeriod: MacrsRecoveryPeriod,
  bonusDepreciationRate: number = 100
): DepreciationEntry[] {
  if (costBasis <= 0) {
    return [];
  }

  const rates = getMacrsRates(recoveryPeriod);
  const isBonusEligible = recoveryPeriod <= BONUS_ELIGIBLE_MAX_PERIOD;

  // Calculate bonus depreciation for eligible assets
  let bonusAmount = 0;
  let remainingBasisAfterBonus = costBasis;

  if (isBonusEligible && bonusDepreciationRate > 0) {
    bonusAmount = costBasis * (bonusDepreciationRate / 100);
    remainingBasisAfterBonus = costBasis - bonusAmount;
  }

  const schedule: DepreciationEntry[] = [];
  let cumulativeDepreciation = 0;

  for (let i = 0; i < rates.length; i++) {
    const yearNumber = i + 1;

    // MACRS depreciation on the remaining basis (after bonus)
    const macrsDepreciation = remainingBasisAfterBonus * (rates[i] / 100);

    // Bonus depreciation is added to the first year only
    const yearBonus = i === 0 ? bonusAmount : 0;
    const totalDepreciation = Math.round((macrsDepreciation + yearBonus) * 100) / 100;

    cumulativeDepreciation = Math.round((cumulativeDepreciation + totalDepreciation) * 100) / 100;
    const remainingBasis = Math.round((costBasis - cumulativeDepreciation) * 100) / 100;

    schedule.push({
      year: yearNumber,
      depreciation: totalDepreciation,
      cumulativeDepreciation,
      remainingBasis: Math.max(remainingBasis, 0),
    });
  }

  return schedule;
}

/**
 * Calculates straight-line depreciation for a building (no cost segregation).
 * Uses 39-year or 27.5-year MACRS tables depending on property type.
 *
 * @param costBasis - The depreciable cost basis of the building
 * @param recoveryPeriod - Either 27.5 (residential) or 39 (nonresidential)
 * @returns Array of yearly depreciation entries
 */
export function calculateStraightLineDepreciation(
  costBasis: number,
  recoveryPeriod: 27.5 | 39
): DepreciationEntry[] {
  return calculateDepreciation(costBasis, recoveryPeriod, 0);
}
