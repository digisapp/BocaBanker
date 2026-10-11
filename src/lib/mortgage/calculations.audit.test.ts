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

  it('totals match the Mortgage calculator (schedule totals, not payment x n)', () => {
    // $300k at 6.5%/30y: $1,896.20 x 360 - 300,000 = $382,632.00, but the
    // amortization schedule (final payment absorbs the cent rounding) totals
    // $382,636.71 of interest — worked independently.
    const r = calculateRateSensitivity(300_000, 6.5, 30);
    const base = r.entries.find((e) => e.rate === 6.5)!;
    expect(base.totalInterest).toBe(382_636.71);
    expect(base.totalCost).toBe(682_636.71);
    for (const e of r.entries) {
      const m = calculateMortgage(300_000, e.rate, 30);
      expect(e.totalInterest).toBe(m.totalInterest);
      expect(e.totalCost).toBe(m.totalCost);
    }
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

  it('months saved: the baseline loan pays off in its scheduled 360 months', () => {
    // $600k at 6%/30y ($3,597.30/mo) with the $90,223.58 year-1 cost seg
    // savings paid down after month 12. Worked independently (exact
    // decimal amortization): the paid-down loan's last payment is month 253,
    // so 360 - 253 = 107 months saved and $297,308.33 less interest. The
    // cent-rounded payment leaves ~$3.17 on the baseline after 360 payments,
    // which used to count as a 361st month (108 saved).
    const r = calculateCombinedAnalysis(1_000_000, 'commercial', 37, 100, 600_000, 7, 25, 6, 30, 0);
    expect(r.costSegFirstYearSavings).toBe(90_223.58);
    expect(r.newMonthlyPayment).toBe(3_597.3);
    expect(r.monthsSavedOnMortgage).toBe(107);
    expect(r.additionalInterestSaved).toBeCloseTo(297_308.33, 1);
  });

  it('no cost seg savings means no months saved', () => {
    const r = calculateCombinedAnalysis(1_000_000, 'commercial', 0, 100, 600_000, 7, 25, 6, 30, 0);
    expect(r.monthsSavedOnMortgage).toBe(0);
    expect(r.additionalInterestSaved).toBe(0);
  });
});

describe('refinance break-even within the loan term', () => {
  it('flags a break-even that never arrives', () => {
    // Same 30-yr term: $1,896.20 -> $1,892.26 saves $3.94/mo, so $6,000 of
    // closing takes 1,523 months to recover
    const r = calculateRefinanceAnalysis(300_000, 6.5, 30, 6.48, 30, 6000);
    expect(r.monthlySavings).toBe(3.94);
    expect(r.breakEvenMonths).toBe(1523);
    expect(r.breakEvenWithinTerm).toBe(false);
  });

  it('a break-even past the end of the current loan is never reached', () => {
    // 10 yrs left at 5% ($2,121.31) -> 15-yr at 9.5% ($2,088.45): $32.86/mo
    // recovers $5,000 in 153 months, but the old loan would be paid off after
    // 120 — the monthly savings stop there
    const r = calculateRefinanceAnalysis(200_000, 5, 10, 9.5, 15, 5000);
    expect(r.monthlySavings).toBe(32.86);
    expect(r.breakEvenMonths).toBe(153);
    expect(r.breakEvenWithinTerm).toBe(false);
  });

  it('a normal refinance breaks even within the term', () => {
    // $1,995.91 -> $1,798.65 saves $197.26/mo: 31 months
    const r = calculateRefinanceAnalysis(300_000, 7, 30, 6, 30, 6000);
    expect(r.breakEvenMonths).toBe(31);
    expect(r.breakEvenWithinTerm).toBe(true);
  });

  it('no monthly savings: not flagged as within term', () => {
    const r = calculateRefinanceAnalysis(300_000, 7, 25, 5.5, 15, 5000);
    expect(r.breakEvenWithinTerm).toBe(false);
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
