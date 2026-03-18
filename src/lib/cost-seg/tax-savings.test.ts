import { describe, it, expect } from 'vitest';
import { calculateTaxSavings } from './tax-savings';

describe('calculateTaxSavings', () => {
  it('calculates savings when accelerated exceeds straight-line', () => {
    const accelerated = [
      { year: 1, depreciation: 100_000 },
      { year: 2, depreciation: 50_000 },
    ];
    const straightLine = [
      { year: 1, depreciation: 25_000 },
      { year: 2, depreciation: 25_000 },
    ];

    const savings = calculateTaxSavings(accelerated, straightLine, 37);

    // Year 1: (100K - 25K) * 0.37 = $27,750
    expect(savings[0].annualSavings).toBeCloseTo(27_750, 0);
    expect(savings[0].withCostSeg).toBeCloseTo(37_000, 0);
    expect(savings[0].withoutCostSeg).toBeCloseTo(9_250, 0);
  });

  it('shows negative savings when straight-line exceeds accelerated in later years', () => {
    const accelerated = [
      { year: 1, depreciation: 80_000 },
      { year: 2, depreciation: 10_000 },
    ];
    const straightLine = [
      { year: 1, depreciation: 25_000 },
      { year: 2, depreciation: 25_000 },
    ];

    const savings = calculateTaxSavings(accelerated, straightLine, 30);

    // Year 2: (10K - 25K) * 0.30 = -$4,500
    expect(savings[1].annualSavings).toBeLessThan(0);
  });

  it('cumulative savings track correctly', () => {
    const accelerated = [
      { year: 1, depreciation: 50_000 },
      { year: 2, depreciation: 30_000 },
      { year: 3, depreciation: 20_000 },
    ];
    const straightLine = [
      { year: 1, depreciation: 25_000 },
      { year: 2, depreciation: 25_000 },
      { year: 3, depreciation: 25_000 },
    ];

    const savings = calculateTaxSavings(accelerated, straightLine, 37);

    let running = 0;
    for (const entry of savings) {
      running += entry.annualSavings;
      expect(entry.cumulativeSavings).toBeCloseTo(running, 1);
    }
  });

  it('handles mismatched schedule lengths', () => {
    const accelerated = [{ year: 1, depreciation: 100_000 }];
    const straightLine = [
      { year: 1, depreciation: 25_000 },
      { year: 2, depreciation: 25_000 },
      { year: 3, depreciation: 25_000 },
    ];

    const savings = calculateTaxSavings(accelerated, straightLine, 37);
    expect(savings).toHaveLength(3); // max of both
    // Year 2+3: accelerated is 0, so savings are negative
    expect(savings[1].annualSavings).toBeLessThan(0);
  });

  it('returns empty array for empty schedules', () => {
    const savings = calculateTaxSavings([], [], 37);
    expect(savings).toHaveLength(0);
  });
});
