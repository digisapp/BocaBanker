import { describe, it, expect } from 'vitest';
import { calculateNPV, calculateIRR } from './npv';

describe('calculateNPV', () => {
  it('calculates NPV for uniform cash flows', () => {
    // 5 years of $10,000 at 5% discount rate
    const npv = calculateNPV([10_000, 10_000, 10_000, 10_000, 10_000], 5);
    // Should be ~$43,295
    expect(npv).toBeCloseTo(43_295, -1);
  });

  it('returns 0 for empty cash flows', () => {
    expect(calculateNPV([], 5)).toBe(0);
  });

  it('higher discount rate reduces NPV', () => {
    const flows = [10_000, 10_000, 10_000];
    const npv5 = calculateNPV(flows, 5);
    const npv10 = calculateNPV(flows, 10);
    expect(npv10).toBeLessThan(npv5);
  });

  it('zero discount rate returns sum of cash flows', () => {
    // At 0% discount, NPV = sum (each divided by 1^n)
    // Actually NPV formula: CF / (1+r)^(t+1), so at r=0: CF / 1
    const flows = [1000, 2000, 3000];
    const npv = calculateNPV(flows, 0);
    expect(npv).toBeCloseTo(6000, 0);
  });

  it('handles negative cash flows', () => {
    const npv = calculateNPV([-50_000, 20_000, 20_000, 20_000], 8);
    expect(npv).toBeLessThan(10_000); // Should be modest
  });

  it('single cash flow discounted correctly', () => {
    // $10,000 in year 1 at 10% = 10000 / 1.10 = 9090.91
    const npv = calculateNPV([10_000], 10);
    expect(npv).toBeCloseTo(9090.91, 0);
  });
});

describe('calculateIRR', () => {
  it('returns NaN for empty cash flows', () => {
    expect(calculateIRR([])).toBeNaN();
  });

  it('returns NaN for all-zero cash flows', () => {
    expect(calculateIRR([0, 0, 0])).toBeNaN();
  });

  it('calculates IRR for standard investment', () => {
    // Invest $1000, get $400 back per year for 3 years
    // IRR should be ~9.7%
    const irr = calculateIRR([-1000, 400, 400, 400]);
    expect(irr).toBeCloseTo(9.7, 0);
  });

  it('calculates IRR for break-even scenario', () => {
    // Invest $1000, get exactly $1000 back in year 1 => IRR = 0%
    const irr = calculateIRR([-1000, 1000]);
    expect(irr).toBeCloseTo(0, 0);
  });

  it('high return yields high IRR', () => {
    // Invest $100, get $200 back in year 1 => IRR = 100%
    const irr = calculateIRR([-100, 200]);
    expect(irr).toBeCloseTo(100, 0);
  });
});
