import { describe, it, expect } from 'vitest';
import { calculateDepreciation, calculateStraightLineDepreciation } from './depreciation';

describe('calculateDepreciation', () => {
  it('returns empty array for zero cost basis', () => {
    expect(calculateDepreciation(0, 5)).toEqual([]);
  });

  it('returns empty array for negative cost basis', () => {
    expect(calculateDepreciation(-1000, 7)).toEqual([]);
  });

  it('generates correct number of years for 5-year property', () => {
    const schedule = calculateDepreciation(100_000, 5, 0);
    expect(schedule).toHaveLength(6); // 5yr + 1 half-year convention
  });

  it('generates correct number of years for 7-year property', () => {
    const schedule = calculateDepreciation(100_000, 7, 0);
    expect(schedule).toHaveLength(8);
  });

  it('generates correct number of years for 15-year property', () => {
    const schedule = calculateDepreciation(100_000, 15, 0);
    expect(schedule).toHaveLength(16);
  });

  it('generates correct number of years for 39-year property', () => {
    const schedule = calculateDepreciation(100_000, 39, 0);
    expect(schedule).toHaveLength(40);
  });

  it('total depreciation equals cost basis (no bonus)', () => {
    const schedule = calculateDepreciation(500_000, 5, 0);
    const total = schedule.reduce((sum, e) => sum + e.depreciation, 0);
    expect(total).toBeCloseTo(500_000, 0);
  });

  it('total depreciation equals cost basis (with 100% bonus)', () => {
    const schedule = calculateDepreciation(500_000, 5, 100);
    const total = schedule.reduce((sum, e) => sum + e.depreciation, 0);
    expect(total).toBeCloseTo(500_000, 0);
  });

  it('applies 100% bonus depreciation in year 1 for eligible assets', () => {
    const schedule = calculateDepreciation(200_000, 5, 100);
    // Year 1 should contain the full $200K bonus + MACRS on $0 remaining
    expect(schedule[0].depreciation).toBeCloseTo(200_000, 0);
  });

  it('does NOT apply bonus to 27.5-year property', () => {
    const schedule = calculateDepreciation(1_000_000, 27.5, 100);
    // Year 1 should just be the MACRS rate, not bonus
    expect(schedule[0].depreciation).toBeLessThan(100_000);
  });

  it('does NOT apply bonus to 39-year property', () => {
    const schedule = calculateDepreciation(1_000_000, 39, 100);
    expect(schedule[0].depreciation).toBeLessThan(100_000);
  });

  it('remaining basis decreases to zero', () => {
    const schedule = calculateDepreciation(300_000, 7, 0);
    const last = schedule[schedule.length - 1];
    expect(last.remainingBasis).toBeCloseTo(0, 0);
  });

  it('cumulative depreciation tracks correctly', () => {
    const schedule = calculateDepreciation(100_000, 15, 0);
    let running = 0;
    for (const entry of schedule) {
      running += entry.depreciation;
      expect(entry.cumulativeDepreciation).toBeCloseTo(running, 1);
    }
  });

  it('applies partial bonus depreciation (60%)', () => {
    const schedule = calculateDepreciation(100_000, 5, 60);
    // Year 1 should have 60% bonus = $60,000 + MACRS on $40,000 remaining
    const bonusPlusMacrs = 60_000 + 40_000 * 0.20;
    expect(schedule[0].depreciation).toBeCloseTo(bonusPlusMacrs, 0);
  });
});

describe('calculateStraightLineDepreciation', () => {
  it('generates schedule for 39-year property', () => {
    const schedule = calculateStraightLineDepreciation(1_000_000, 39);
    expect(schedule).toHaveLength(40);
  });

  it('generates schedule for 27.5-year property', () => {
    const schedule = calculateStraightLineDepreciation(500_000, 27.5);
    expect(schedule).toHaveLength(28);
  });

  it('total 39-year depreciation equals cost basis', () => {
    const schedule = calculateStraightLineDepreciation(1_000_000, 39);
    const total = schedule.reduce((sum, e) => sum + e.depreciation, 0);
    // The IRS Table A-7a month-1 column sums to exactly 100.000%, so the
    // schedule should recover the full basis (small tolerance for cent rounding).
    expect(Math.abs(total - 1_000_000)).toBeLessThan(100);
  });

  it('total 27.5-year depreciation equals cost basis', () => {
    const schedule = calculateStraightLineDepreciation(1_000_000, 27.5);
    const total = schedule.reduce((sum, e) => sum + e.depreciation, 0);
    expect(Math.abs(total - 1_000_000)).toBeLessThan(100);
  });

  it('no bonus depreciation is applied', () => {
    const schedule = calculateStraightLineDepreciation(1_000_000, 39);
    // Year 1 should be ~2.461% of $1M = ~$24,610
    expect(schedule[0].depreciation).toBeCloseTo(24_610, 0);
  });
});

describe('calculateDepreciation with the mid-quarter convention', () => {
  it('Q4 5-year, no bonus: 5% in year 1 (vs 20% half-year)', () => {
    const mq = calculateDepreciation(100_000, 5, 0, 11, true);
    expect(mq.map((e) => e.depreciation)).toEqual([5_000, 38_000, 22_800, 13_680, 10_940, 9_580]);
    expect(mq[mq.length - 1].cumulativeDepreciation).toBe(100_000);
    expect(calculateDepreciation(100_000, 5, 0, 11)[0].depreciation).toBe(20_000);
  });

  it('applies bonus to the full basis first, then the quarter table to the rest', () => {
    // 60% bonus + 40,000 x 3.57% (Q4 7-year)
    const mq = calculateDepreciation(100_000, 7, 60, 12, true);
    expect(mq[0].depreciation).toBe(60_000 + 1_428);
    expect(mq[1].depreciation).toBe(11_020); // 40,000 x 27.55%
    expect(mq[mq.length - 1].cumulativeDepreciation).toBe(100_000);
  });

  it('100% bonus leaves nothing for the convention to change', () => {
    expect(calculateDepreciation(100_000, 15, 100, 10, true)[0].depreciation).toBe(100_000);
  });

  it('does not change real property (mid-month)', () => {
    expect(calculateDepreciation(1_000_000, 39, 0, 11, true)).toEqual(
      calculateDepreciation(1_000_000, 39, 0, 11)
    );
  });
});
