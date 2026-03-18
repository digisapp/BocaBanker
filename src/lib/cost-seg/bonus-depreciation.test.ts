import { describe, it, expect } from 'vitest';
import { calculateBonusDepreciation } from './bonus-depreciation';

describe('calculateBonusDepreciation', () => {
  it('returns zeros for zero cost basis', () => {
    const result = calculateBonusDepreciation(0, 5);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(0);
    expect(result.firstYearTotal).toBe(0);
  });

  it('applies 100% bonus for 5-year property', () => {
    const result = calculateBonusDepreciation(100_000, 5, 100);
    expect(result.bonusAmount).toBe(100_000);
    expect(result.remainingBasis).toBe(0);
    // First year total = bonus + MACRS on $0
    expect(result.firstYearTotal).toBe(100_000);
  });

  it('applies 100% bonus for 7-year property', () => {
    const result = calculateBonusDepreciation(200_000, 7, 100);
    expect(result.bonusAmount).toBe(200_000);
    expect(result.firstYearTotal).toBe(200_000);
  });

  it('applies 100% bonus for 15-year property', () => {
    const result = calculateBonusDepreciation(500_000, 15, 100);
    expect(result.bonusAmount).toBe(500_000);
  });

  it('does NOT apply bonus for 27.5-year property', () => {
    const result = calculateBonusDepreciation(1_000_000, 27.5, 100);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(1_000_000);
  });

  it('does NOT apply bonus for 39-year property', () => {
    const result = calculateBonusDepreciation(1_000_000, 39, 100);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(1_000_000);
  });

  it('applies partial bonus (60%)', () => {
    const result = calculateBonusDepreciation(100_000, 5, 60);
    expect(result.bonusAmount).toBe(60_000);
    expect(result.remainingBasis).toBe(40_000);
    // First year: $60K bonus + 20% MACRS on $40K = $60K + $8K = $68K
    expect(result.firstYearTotal).toBeCloseTo(68_000, 0);
  });

  it('applies zero bonus rate', () => {
    const result = calculateBonusDepreciation(100_000, 5, 0);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(100_000);
    // First year = just MACRS year 1: 20% of $100K = $20K
    expect(result.firstYearTotal).toBeCloseTo(20_000, 0);
  });

  it('defaults to 100% bonus rate', () => {
    const result = calculateBonusDepreciation(100_000, 5);
    expect(result.bonusAmount).toBe(100_000);
  });
});
