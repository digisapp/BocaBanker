import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  calculateMortgage,
  calculateRefinanceAnalysis,
  calculateRateSensitivity,
  calculateCombinedAnalysis,
  getFhaAnnualMipRate,
} from './calculations';

describe('calculateMonthlyPayment edge cases', () => {
  it('returns 0 (not NaN) for NaN / empty-string inputs', () => {
    expect(calculateMonthlyPayment(NaN, 6, 30)).toBe(0);
    expect(calculateMonthlyPayment(300_000, NaN, 30)).toBe(0);
    expect(calculateMonthlyPayment(300_000, 6, NaN)).toBe(0);
    expect(calculateMonthlyPayment(300_000, 6, Infinity)).toBe(0);
  });

  it('rounds the 0% payment to cents', () => {
    // 100,000 / 360 = 277.777...
    expect(calculateMonthlyPayment(100_000, 0, 30)).toBe(277.78);
  });

  it('uses whole months for fractional terms', () => {
    const schedule = generateAmortizationSchedule(200_000, 6, 22.5);
    expect(schedule).toHaveLength(270);
    expect(schedule[schedule.length - 1].balance).toBe(0);
  });

  it('0% loan fully amortizes', () => {
    const s = generateAmortizationSchedule(100_000, 0, 30);
    expect(s).toHaveLength(360);
    expect(s[s.length - 1].balance).toBe(0);
    expect(s[s.length - 1].cumulativePrincipal).toBeCloseTo(100_000, 2);
  });
});

describe('calculateMortgage totals', () => {
  it('total cost = all payments + escrow for the life of the loan', () => {
    const r = calculateMortgage(400_000, 6.5, 30, 6000, 2400);
    const payments = r.monthlySchedule.reduce((s, m) => s + m.payment, 0);
    expect(r.totalCost).toBeCloseTo(payments + 8400 * 30, 2);
    expect(r.totalInterest).toBeCloseTo(payments - 400_000, 1);
  });
});

describe('calculateRefinanceAnalysis — full-life comparison', () => {
  it('term extension: lower payment but costs more in total', () => {
    // 400k, 25 yrs left at 7% -> new 30-yr at 6%, $8k closing.
    // Current: 2827.12 x 300 = 848,136; new: 2398.20 x 360 = 863,352.
    const r = calculateRefinanceAnalysis(400_000, 7, 25, 6, 30, 8000);
    expect(r.currentMonthlyPayment).toBeCloseTo(2827.12, 2);
    expect(r.newMonthlyPayment).toBeCloseTo(2398.2, 2);
    expect(r.monthlySavings).toBeGreaterThan(0);
    // Previously reported +$120,679 (monthly savings x 300 - closing),
    // ignoring the extra 5 years of new-loan payments.
    expect(r.totalSavingsOverTerm).toBeLessThan(0);
    expect(r.totalSavingsOverTerm).toBeCloseTo(848_136 - 863_352 - 8000, -1);
    // Total savings = interest saved - closing costs (same principal)
    expect(r.totalSavingsOverTerm).toBeCloseTo(r.interestSaved - 8000, 0);
    // Schedule covers the longer (30-yr) loan, with $0 current payments at the end
    expect(r.savingsSchedule).toHaveLength(30);
    expect(r.savingsSchedule[29].currentPayment).toBe(0);
    expect(r.savingsSchedule[29].annualSavings).toBeLessThan(0);
    expect(r.savingsSchedule[29].cumulativeSavings).toBeCloseTo(r.totalSavingsOverTerm, 0);
  });

  it('term shortening: higher payment but saves in total', () => {
    // 300k, 25 left at 7% -> 15-yr at 5.5%
    const r = calculateRefinanceAnalysis(300_000, 7, 25, 5.5, 15, 5000);
    expect(r.monthlySavings).toBeLessThan(0);
    expect(r.breakEvenMonths).toBe(0);
    expect(r.totalSavingsOverTerm).toBeGreaterThan(0);
    expect(r.savingsSchedule).toHaveLength(25);
    // Years 16-25: no new-loan payment, full current payment saved
    expect(r.savingsSchedule[20].newPayment).toBe(0);
    expect(r.savingsSchedule[20].annualSavings).toBeCloseTo(r.currentMonthlyPayment * 12, 0);
  });

  it('same term: total savings = monthly savings x n - closing (within final-payment rounding)', () => {
    const r = calculateRefinanceAnalysis(300_000, 7, 30, 6, 30, 6000);
    expect(r.totalSavingsOverTerm).toBeCloseTo(r.monthlySavings * 360 - 6000, -1);
  });

  it('includes points in closing costs', () => {
    const r = calculateRefinanceAnalysis(300_000, 7, 30, 6, 30, 5000, 1);
    expect(r.closingCosts).toBe(8000);
  });

  it('lifetime interest equals the amortization schedule interest', () => {
    const r = calculateRefinanceAnalysis(350_000, 7, 25, 5.5, 30, 0);
    const cur = generateAmortizationSchedule(350_000, 7, 25).reduce((s, m) => s + m.interest, 0);
    expect(r.lifetimeInterestCurrent).toBeCloseTo(cur, 2);
  });
});

describe('calculateRateSensitivity grid', () => {
  it('always contains the base rate when the grid would dip below zero', () => {
    // Old code clamped the start to 0.25% and stepped from there, giving
    // 0.25, 0.5, 0.75, 1.0, 1.25 ... — the base rate 1.1% was not on the grid.
    const r = calculateRateSensitivity(300_000, 1.1, 30);
    expect(r.entries.some((e) => e.rate === 1.1)).toBe(true);
    const base = r.entries.find((e) => e.rate === 1.1)!;
    expect(base.changeFromBase).toBe(0);
    expect(r.entries.every((e) => e.rate > 0)).toBe(true);
  });

  it('produces 2*steps+1 evenly spaced entries without float drift', () => {
    const r = calculateRateSensitivity(400_000, 6.5, 30, 0.125, 8);
    expect(r.entries).toHaveLength(17);
    expect(r.entries[0].rate).toBe(5.5);
    expect(r.entries[16].rate).toBe(7.5);
  });
});

describe('calculateCombinedAnalysis refinance consistency', () => {
  it('matches the standalone refinance analysis over the full loan lives', () => {
    const combined = calculateCombinedAnalysis(
      2_000_000, 'commercial', 37, 100,
      1_500_000, 7.5, 25, 6.25, 30, 20_000
    );
    const refi = calculateRefinanceAnalysis(1_500_000, 7.5, 25, 6.25, 30, 20_000);
    expect(combined.refiTotalSavings).toBe(refi.totalSavingsOverTerm);
    expect(combined.combinedSchedule).toHaveLength(30);
    expect(combined.combinedSchedule[29].refiSavings).toBeCloseTo(
      refi.savingsSchedule[29].annualSavings,
      2
    );
  });

  it('honors a 0% bonus rate', () => {
    const zero = calculateCombinedAnalysis(2_000_000, 'commercial', 37, 0, 1_000_000, 7, 25, 6, 30, 0);
    const full = calculateCombinedAnalysis(2_000_000, 'commercial', 37, 100, 1_000_000, 7, 25, 6, 30, 0);
    expect(zero.costSegFirstYearSavings).toBeLessThan(full.costSegFirstYearSavings);
  });
});

describe('getFhaAnnualMipRate (HUD ML 2023-05)', () => {
  it('30-yr, base loan <= $726,200', () => {
    expect(getFhaAnnualMipRate(482_500, 96.5, 30)).toBe(0.55);
    expect(getFhaAnnualMipRate(450_000, 90, 30)).toBe(0.5);
  });
  it('30-yr, high balance', () => {
    expect(getFhaAnnualMipRate(800_000, 96.5, 30)).toBe(0.75);
    expect(getFhaAnnualMipRate(800_000, 95, 30)).toBe(0.7);
  });
  it('15-yr terms', () => {
    expect(getFhaAnnualMipRate(300_000, 95, 15)).toBe(0.4);
    expect(getFhaAnnualMipRate(300_000, 90, 15)).toBe(0.15);
    expect(getFhaAnnualMipRate(800_000, 95, 15)).toBe(0.65);
    expect(getFhaAnnualMipRate(800_000, 85, 15)).toBe(0.4);
    expect(getFhaAnnualMipRate(800_000, 78, 15)).toBe(0.15);
  });
});
