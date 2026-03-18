import { describe, it, expect } from 'vitest';
import { getDefaultAllocation, TYPICAL_RECLASSIFICATION } from './asset-classes';

describe('getDefaultAllocation', () => {
  it('returns allocation for commercial property', () => {
    const allocation = getDefaultAllocation('commercial', 1_000_000);
    expect(allocation.length).toBeGreaterThan(0);

    // Percentages should sum to 100
    const totalPct = allocation.reduce((sum, a) => sum + a.percentage, 0);
    expect(totalPct).toBe(100);

    // Amounts should sum to total value
    const totalAmount = allocation.reduce((sum, a) => sum + a.amount, 0);
    expect(totalAmount).toBeCloseTo(1_000_000, 0);
  });

  it('handles all supported property types', () => {
    const types = Object.keys(TYPICAL_RECLASSIFICATION);
    for (const type of types) {
      const allocation = getDefaultAllocation(type, 500_000);
      expect(allocation.length).toBeGreaterThan(0);
    }
  });

  it('is case-insensitive', () => {
    const lower = getDefaultAllocation('commercial', 1_000_000);
    const upper = getDefaultAllocation('COMMERCIAL', 1_000_000);
    expect(lower).toEqual(upper);
  });

  it('throws for unknown property type', () => {
    expect(() => getDefaultAllocation('spaceship', 1_000_000)).toThrow('Unknown property type');
  });

  it('includes land as non-depreciable (recovery period 0)', () => {
    const allocation = getDefaultAllocation('commercial', 1_000_000);
    const land = allocation.find((a) => a.recoveryPeriod === 0);
    expect(land).toBeDefined();
    expect(land!.amount).toBeGreaterThan(0);
  });

  it('includes short-life assets eligible for bonus depreciation', () => {
    const allocation = getDefaultAllocation('industrial', 1_000_000);
    const shortLife = allocation.filter((a) => a.recoveryPeriod <= 15 && a.recoveryPeriod > 0);
    expect(shortLife.length).toBeGreaterThan(0);
    // Industrial should have higher reclassification %
    const shortLifePct = shortLife.reduce((sum, a) => sum + a.percentage, 0);
    expect(shortLifePct).toBeGreaterThanOrEqual(30); // 12 + 8 + 12 = 32%
  });

  it('hospitality has highest short-life allocation', () => {
    const hospitality = getDefaultAllocation('hospitality', 1_000_000);
    const commercial = getDefaultAllocation('commercial', 1_000_000);

    const hospShort = hospitality
      .filter((a) => a.recoveryPeriod <= 15 && a.recoveryPeriod > 0)
      .reduce((sum, a) => sum + a.percentage, 0);
    const commShort = commercial
      .filter((a) => a.recoveryPeriod <= 15 && a.recoveryPeriod > 0)
      .reduce((sum, a) => sum + a.percentage, 0);

    expect(hospShort).toBeGreaterThan(commShort);
  });
});
