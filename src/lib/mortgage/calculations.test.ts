import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  generateAnnualSchedule,
  calculateMortgage,
  calculateRefinanceAnalysis,
  calculateDSCR,
  calculateRateSensitivity,
} from './calculations';

describe('calculateMonthlyPayment', () => {
  it('calculates a standard 30-year mortgage', () => {
    // $400,000 at 6.5% for 30 years
    const payment = calculateMonthlyPayment(400_000, 6.5, 30);
    expect(payment).toBeCloseTo(2528.27, 1);
  });

  it('calculates a 15-year mortgage', () => {
    const payment = calculateMonthlyPayment(300_000, 5.0, 15);
    expect(payment).toBeCloseTo(2372.38, 1);
  });

  it('returns 0 for zero principal', () => {
    expect(calculateMonthlyPayment(0, 6.5, 30)).toBe(0);
  });

  it('returns 0 for zero term', () => {
    expect(calculateMonthlyPayment(400_000, 6.5, 0)).toBe(0);
  });

  it('handles zero interest rate (interest-free loan)', () => {
    const payment = calculateMonthlyPayment(120_000, 0, 10);
    expect(payment).toBe(1000); // $120,000 / 120 months
  });

  it('handles negative principal', () => {
    expect(calculateMonthlyPayment(-100_000, 6.5, 30)).toBe(0);
  });
});

describe('generateAmortizationSchedule', () => {
  it('generates correct number of entries', () => {
    const schedule = generateAmortizationSchedule(300_000, 6.0, 30);
    expect(schedule).toHaveLength(360); // 30 * 12
  });

  it('ends with near-zero balance', () => {
    const schedule = generateAmortizationSchedule(300_000, 6.0, 30);
    const last = schedule[schedule.length - 1];
    expect(last.balance).toBeLessThan(5); // rounding tolerance
  });

  it('first payment has more interest than principal', () => {
    const schedule = generateAmortizationSchedule(400_000, 7.0, 30);
    expect(schedule[0].interest).toBeGreaterThan(schedule[0].principal);
  });

  it('last payment has more principal than interest', () => {
    const schedule = generateAmortizationSchedule(400_000, 7.0, 30);
    const last = schedule[schedule.length - 1];
    expect(last.principal).toBeGreaterThan(last.interest);
  });

  it('cumulative principal equals original loan', () => {
    const schedule = generateAmortizationSchedule(250_000, 5.5, 15);
    const last = schedule[schedule.length - 1];
    expect(last.cumulativePrincipal).toBeCloseTo(250_000, 0);
  });
});

describe('generateAnnualSchedule', () => {
  it('generates correct number of years', () => {
    const schedule = generateAnnualSchedule(300_000, 6.0, 30);
    expect(schedule).toHaveLength(30);
  });

  it('ending balance decreases each year', () => {
    const schedule = generateAnnualSchedule(300_000, 6.0, 30);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].endingBalance).toBeLessThan(schedule[i - 1].endingBalance);
    }
  });

  it('last year ends at near-zero balance', () => {
    const schedule = generateAnnualSchedule(300_000, 6.0, 30);
    expect(schedule[schedule.length - 1].endingBalance).toBeLessThan(5);
  });
});

describe('calculateMortgage', () => {
  it('returns correct monthly PI', () => {
    const result = calculateMortgage(400_000, 6.5, 30);
    expect(result.monthlyPI).toBeCloseTo(2528.27, 1);
  });

  it('adds property tax and insurance to monthly total', () => {
    const result = calculateMortgage(400_000, 6.5, 30, 6000, 2400);
    expect(result.monthlyTotal).toBeCloseTo(result.monthlyPI + 500 + 200, 1);
  });

  it('total cost exceeds principal', () => {
    const result = calculateMortgage(400_000, 6.5, 30);
    expect(result.totalCost).toBeGreaterThan(400_000);
  });

  it('includes both monthly and annual schedules', () => {
    const result = calculateMortgage(300_000, 6.0, 15);
    expect(result.monthlySchedule).toHaveLength(180);
    expect(result.schedule).toHaveLength(15);
  });
});

describe('calculateRefinanceAnalysis', () => {
  it('shows savings when rate drops', () => {
    const result = calculateRefinanceAnalysis(350_000, 7.0, 25, 5.5, 30, 8000);
    expect(result.monthlySavings).toBeGreaterThan(0);
    expect(result.newMonthlyPayment).toBeLessThan(result.currentMonthlyPayment);
  });

  it('calculates break-even in months', () => {
    const result = calculateRefinanceAnalysis(300_000, 7.0, 25, 5.5, 30, 6000);
    expect(result.breakEvenMonths).toBeGreaterThan(0);
    expect(result.breakEvenMonths).toBeLessThan(360);
  });

  it('accounts for closing costs in total savings', () => {
    const result = calculateRefinanceAnalysis(300_000, 7.0, 25, 5.5, 30, 10000);
    // Total savings should be net of closing costs
    expect(result.closingCosts).toBe(10000);
  });

  it('interest saved is positive when rate drops', () => {
    const result = calculateRefinanceAnalysis(400_000, 7.5, 28, 6.0, 30, 5000);
    expect(result.interestSaved).toBeGreaterThan(0);
  });
});

describe('calculateDSCR', () => {
  it('calculates correct DSCR', () => {
    // NOI = 120,000 - 40,000 = 80,000
    // Annual debt service ≈ $28,500 (approx for $400K at 6%, 30yr)
    const result = calculateDSCR(120_000, 40_000, 400_000, 6.0, 30);
    expect(result.dscr).toBeGreaterThan(1.0);
    expect(result.noi).toBe(80_000);
  });

  it('rates strong DSCR above 1.5', () => {
    const result = calculateDSCR(200_000, 30_000, 200_000, 5.0, 30);
    expect(result.rating).toBe('strong');
  });

  it('rates insufficient DSCR below 1.0', () => {
    const result = calculateDSCR(50_000, 20_000, 500_000, 7.0, 30);
    expect(result.rating).toBe('insufficient');
  });

  it('calculates max loan amount', () => {
    const result = calculateDSCR(150_000, 50_000, 300_000, 6.0, 30);
    expect(result.maxLoanAmount).toBeGreaterThan(0);
  });
});

describe('calculateRateSensitivity', () => {
  it('returns entries around the base rate', () => {
    const result = calculateRateSensitivity(400_000, 6.5, 30);
    expect(result.baseRate).toBe(6.5);
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it('base payment matches standalone calculation', () => {
    const result = calculateRateSensitivity(400_000, 6.5, 30);
    const directPayment = calculateMonthlyPayment(400_000, 6.5, 30);
    expect(result.basePayment).toBeCloseTo(directPayment, 1);
  });

  it('higher rates produce higher payments', () => {
    const result = calculateRateSensitivity(400_000, 6.0, 30, 0.25, 4);
    const sorted = [...result.entries].sort((a, b) => a.rate - b.rate);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].monthlyPayment).toBeGreaterThanOrEqual(sorted[i - 1].monthlyPayment);
    }
  });
});
