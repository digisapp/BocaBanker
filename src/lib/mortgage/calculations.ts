/**
 * Mortgage & Refinance Calculation Engine
 *
 * Pure functions for mortgage payment, amortization, and refinance analysis.
 * Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */

import { calculateNPV } from '@/lib/cost-seg/npv';
import { getDefaultAllocation } from '@/lib/cost-seg/asset-classes';
import { calculateDepreciation, calculateStraightLineDepreciation } from '@/lib/cost-seg/depreciation';
import { calculateTaxSavings } from '@/lib/cost-seg/tax-savings';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

// ─── Types ───────────────────────────────────────────────────────────

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AnnualAmortizationEntry {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  endingBalance: number;
  cumulativeInterest: number;
}

export interface MortgageResult {
  monthlyPI: number;
  monthlyTotal: number;
  totalInterest: number;
  totalCost: number;
  schedule: AnnualAmortizationEntry[];
  monthlySchedule: AmortizationEntry[];
}

export interface RefinanceSavingsEntry {
  year: number;
  currentPayment: number;
  newPayment: number;
  annualSavings: number;
  cumulativeSavings: number;
}

export interface RefinanceResult {
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  breakEvenMonths: number;
  totalSavingsOverTerm: number;
  npvSavings: number;
  lifetimeInterestCurrent: number;
  lifetimeInterestNew: number;
  interestSaved: number;
  closingCosts: number;
  savingsSchedule: RefinanceSavingsEntry[];
}

export interface DSCRResult {
  dscr: number;
  noi: number;
  annualDebtService: number;
  monthlyDebtService: number;
  rating: 'strong' | 'adequate' | 'weak' | 'insufficient';
  ratingLabel: string;
  maxLoanAmount: number;
}

export interface RateSensitivityEntry {
  rate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  changeFromBase: number;
}

export interface RateSensitivityResult {
  baseRate: number;
  basePayment: number;
  entries: RateSensitivityEntry[];
}

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Calculates the monthly payment for a fixed-rate mortgage.
 *
 * @param principal - Loan amount in dollars
 * @param annualRate - Annual interest rate as percentage (e.g., 6.5 for 6.5%)
 * @param termYears - Loan term in years
 * @returns Monthly principal & interest payment
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const r = annualRate / 100 / 12; // Monthly rate
  const n = termYears * 12; // Total payments

  const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment * 100) / 100;
}

/**
 * Generates a month-by-month amortization schedule.
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number
): AmortizationEntry[] {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears);
  if (monthlyPayment <= 0) return [];

  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  const schedule: AmortizationEntry[] = [];

  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let month = 1; month <= n; month++) {
    const interest = Math.round(balance * r * 100) / 100;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    cumulativeInterest += interest;
    cumulativePrincipal += principalPaid;

    schedule.push({
      month,
      payment: Math.round((interest + principalPaid) * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
      cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Aggregates monthly amortization into annual summaries.
 */
export function generateAnnualSchedule(
  principal: number,
  annualRate: number,
  termYears: number
): AnnualAmortizationEntry[] {
  const monthly = generateAmortizationSchedule(principal, annualRate, termYears);
  const annual: AnnualAmortizationEntry[] = [];

  for (let year = 1; year <= termYears; year++) {
    const startMonth = (year - 1) * 12;
    const yearMonths = monthly.slice(startMonth, startMonth + 12);
    if (yearMonths.length === 0) break;

    annual.push({
      year,
      totalPayment: Math.round(yearMonths.reduce((s, m) => s + m.payment, 0) * 100) / 100,
      totalPrincipal: Math.round(yearMonths.reduce((s, m) => s + m.principal, 0) * 100) / 100,
      totalInterest: Math.round(yearMonths.reduce((s, m) => s + m.interest, 0) * 100) / 100,
      endingBalance: yearMonths[yearMonths.length - 1].balance,
      cumulativeInterest: yearMonths[yearMonths.length - 1].cumulativeInterest,
    });
  }

  return annual;
}

/**
 * Full mortgage calculation — monthly payment, totals, and schedules.
 */
export function calculateMortgage(
  loanAmount: number,
  interestRate: number,
  termYears: number,
  propertyTax: number = 0,
  insurance: number = 0
): MortgageResult {
  const monthlyPI = calculateMonthlyPayment(loanAmount, interestRate, termYears);
  const monthlyTax = propertyTax / 12;
  const monthlyInsurance = insurance / 12;
  const monthlyTotal = Math.round((monthlyPI + monthlyTax + monthlyInsurance) * 100) / 100;

  const totalPayments = monthlyPI * termYears * 12;
  const totalInterest = Math.round((totalPayments - loanAmount) * 100) / 100;
  const totalCost = Math.round((totalPayments + propertyTax * termYears + insurance * termYears) * 100) / 100;

  return {
    monthlyPI: Math.round(monthlyPI * 100) / 100,
    monthlyTotal,
    totalInterest,
    totalCost,
    schedule: generateAnnualSchedule(loanAmount, interestRate, termYears),
    monthlySchedule: generateAmortizationSchedule(loanAmount, interestRate, termYears),
  };
}

/**
 * Refinance analysis — compares current loan against proposed new loan.
 */
export function calculateRefinanceAnalysis(
  currentBalance: number,
  currentRate: number,
  remainingYears: number,
  newRate: number,
  newTermYears: number,
  closingCosts: number,
  points: number = 0
): RefinanceResult {
  const currentMonthly = calculateMonthlyPayment(currentBalance, currentRate, remainingYears);
  const totalClosingCosts = closingCosts + (currentBalance * points / 100);
  const newMonthly = calculateMonthlyPayment(currentBalance, newRate, newTermYears);
  const monthlySavings = Math.round((currentMonthly - newMonthly) * 100) / 100;

  // Break-even: months until cumulative savings covers closing costs
  let breakEvenMonths = 0;
  if (monthlySavings > 0) {
    breakEvenMonths = Math.ceil(totalClosingCosts / monthlySavings);
  }

  // Lifetime interest calculations
  const lifetimeInterestCurrent = Math.round((currentMonthly * remainingYears * 12 - currentBalance) * 100) / 100;
  const lifetimeInterestNew = Math.round((newMonthly * newTermYears * 12 - currentBalance) * 100) / 100;
  const interestSaved = Math.round((lifetimeInterestCurrent - lifetimeInterestNew) * 100) / 100;

  // Total savings over the comparison period (use shorter of the two terms)
  const comparisonYears = Math.min(remainingYears, newTermYears);
  const totalSavingsOverTerm = Math.round(
    (monthlySavings * comparisonYears * 12 - totalClosingCosts) * 100
  ) / 100;

  // NPV of annual savings at 5% discount rate
  const annualSavingsArray: number[] = [];
  annualSavingsArray.push(-totalClosingCosts); // Upfront cost
  for (let y = 0; y < comparisonYears; y++) {
    annualSavingsArray.push(monthlySavings * 12);
  }
  const npvSavings = calculateNPV(annualSavingsArray, 5);

  // Year-by-year savings schedule
  const savingsSchedule: RefinanceSavingsEntry[] = [];
  let cumSavings = -totalClosingCosts;
  for (let year = 1; year <= comparisonYears; year++) {
    const annualCurrent = currentMonthly * 12;
    const annualNew = newMonthly * 12;
    const annualSaving = Math.round((annualCurrent - annualNew) * 100) / 100;
    cumSavings += annualSaving;

    savingsSchedule.push({
      year,
      currentPayment: Math.round(annualCurrent * 100) / 100,
      newPayment: Math.round(annualNew * 100) / 100,
      annualSavings: annualSaving,
      cumulativeSavings: Math.round(cumSavings * 100) / 100,
    });
  }

  return {
    currentMonthlyPayment: Math.round(currentMonthly * 100) / 100,
    newMonthlyPayment: Math.round(newMonthly * 100) / 100,
    monthlySavings,
    breakEvenMonths,
    totalSavingsOverTerm,
    npvSavings,
    lifetimeInterestCurrent,
    lifetimeInterestNew,
    interestSaved,
    closingCosts: Math.round(totalClosingCosts * 100) / 100,
    savingsSchedule,
  };
}

/**
 * DSCR (Debt Service Coverage Ratio) calculation.
 * DSCR = NOI / Annual Debt Service
 *
 * @param grossIncome - Annual gross rental/operating income
 * @param operatingExpenses - Annual operating expenses (excluding debt service)
 * @param loanAmount - Total loan amount
 * @param interestRate - Annual interest rate as percentage
 * @param termYears - Loan term in years
 */
export function calculateDSCR(
  grossIncome: number,
  operatingExpenses: number,
  loanAmount: number,
  interestRate: number,
  termYears: number
): DSCRResult {
  const noi = grossIncome - operatingExpenses;
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, termYears);
  const annualDebtService = monthlyPayment * 12;

  const dscr = annualDebtService > 0
    ? Math.round((noi / annualDebtService) * 100) / 100
    : 0;

  let rating: DSCRResult['rating'];
  let ratingLabel: string;
  if (dscr >= 1.5) {
    rating = 'strong';
    ratingLabel = 'Strong — Easily meets lender requirements';
  } else if (dscr >= 1.25) {
    rating = 'adequate';
    ratingLabel = 'Adequate — Meets most lender minimums';
  } else if (dscr >= 1.0) {
    rating = 'weak';
    ratingLabel = 'Weak — May face difficulty qualifying';
  } else {
    rating = 'insufficient';
    ratingLabel = 'Insufficient — NOI does not cover debt service';
  }

  // Max loan amount the NOI can support at 1.25 DSCR
  const targetAnnualDebtService = noi / 1.25;
  const targetMonthly = targetAnnualDebtService / 12;
  let maxLoanAmount = 0;
  if (targetMonthly > 0 && interestRate > 0) {
    const r = interestRate / 100 / 12;
    const n = termYears * 12;
    maxLoanAmount = Math.round(targetMonthly * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
  }

  return {
    dscr,
    noi: Math.round(noi * 100) / 100,
    annualDebtService: Math.round(annualDebtService * 100) / 100,
    monthlyDebtService: Math.round(monthlyPayment * 100) / 100,
    rating,
    ratingLabel,
    maxLoanAmount,
  };
}

/**
 * Rate sensitivity analysis — shows how payment changes across a range of rates.
 *
 * @param loanAmount - Loan amount in dollars
 * @param baseRate - Current/base annual interest rate as percentage
 * @param termYears - Loan term in years
 * @param stepSize - Rate increment (default 0.25%)
 * @param steps - Number of steps above and below base rate (default 8)
 */
export function calculateRateSensitivity(
  loanAmount: number,
  baseRate: number,
  termYears: number,
  stepSize: number = 0.25,
  steps: number = 8
): RateSensitivityResult {
  const basePayment = calculateMonthlyPayment(loanAmount, baseRate, termYears);
  const entries: RateSensitivityEntry[] = [];

  const minRate = Math.max(0.25, baseRate - steps * stepSize);
  const maxRate = baseRate + steps * stepSize;

  for (let rate = minRate; rate <= maxRate + 0.001; rate += stepSize) {
    const roundedRate = Math.round(rate * 1000) / 1000;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, roundedRate, termYears);
    const totalCost = monthlyPayment * termYears * 12;
    const totalInterest = totalCost - loanAmount;

    entries.push({
      rate: roundedRate,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      changeFromBase: Math.round((monthlyPayment - basePayment) * 100) / 100,
    });
  }

  return {
    baseRate,
    basePayment: Math.round(basePayment * 100) / 100,
    entries,
  };
}

// ─── Combined Analysis ──────────────────────────────────────────────

export interface CombinedYearEntry {
  year: number;
  costSegSavings: number;
  refiSavings: number;
  combinedSavings: number;
  cumulativeBenefit: number;
  loanBalanceWithPaydown: number;
  loanBalanceWithout: number;
}

export interface CombinedAnalysisResult {
  // Cost Seg
  costSegFirstYearSavings: number;
  costSegFiveYearSavings: number;
  costSegTotalSavings: number;
  reclassifiedPercentage: number;
  // Refinance
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  refiBreakEvenMonths: number;
  refiTotalSavings: number;
  // Combined
  totalYear1Benefit: number;
  totalFiveYearBenefit: number;
  monthsSavedOnMortgage: number;
  additionalInterestSaved: number;
  combinedSchedule: CombinedYearEntry[];
}

/**
 * Combined Cost Seg + Refinance analysis.
 * Shows the total financial impact of doing both strategies together,
 * including the effect of applying Year 1 cost seg savings to principal.
 */
export function calculateCombinedAnalysis(
  propertyValue: number,
  propertyType: string,
  taxRate: number,
  bonusDepreciationRate: number,
  loanAmount: number,
  currentRate: number,
  remainingYears: number,
  newRate: number,
  newTermYears: number,
  closingCosts: number
): CombinedAnalysisResult {
  // ── Cost Seg Calculation ──
  const allocation = getDefaultAllocation(propertyType, propertyValue);

  // Build combined accelerated depreciation schedule
  const maxYears = 40;
  const acceleratedByYear = new Array(maxYears).fill(0);

  // Determine building recovery period (residential = 27.5, else 39)
  const residentialTypes = ['residential', 'multifamily'];
  const buildingPeriod: 27.5 | 39 = residentialTypes.includes(propertyType.toLowerCase()) ? 27.5 : 39;

  let reclassifiedAmount = 0;
  let buildingBasis = 0;

  for (const asset of allocation) {
    if (asset.recoveryPeriod === 0) continue; // Skip land
    const schedule = calculateDepreciation(
      asset.amount,
      asset.recoveryPeriod as MacrsRecoveryPeriod,
      asset.recoveryPeriod <= 20 ? bonusDepreciationRate : 0
    );
    for (const entry of schedule) {
      if (entry.year <= maxYears) {
        acceleratedByYear[entry.year - 1] += entry.depreciation;
      }
    }
    if (asset.recoveryPeriod <= 20) {
      reclassifiedAmount += asset.amount;
    }
    if (asset.recoveryPeriod === 27.5 || asset.recoveryPeriod === 39) {
      buildingBasis += asset.amount;
    }
  }

  // Straight-line baseline (all depreciable value at building rate)
  const depreciableBasis = allocation
    .filter((a) => a.recoveryPeriod > 0)
    .reduce((sum, a) => sum + a.amount, 0);
  const straightLine = calculateStraightLineDepreciation(depreciableBasis, buildingPeriod);

  // Build schedules for tax savings calc
  const accSchedule = acceleratedByYear.map((dep, i) => ({
    year: i + 1,
    depreciation: Math.round(dep * 100) / 100,
  })).filter((e) => e.depreciation > 0 || e.year <= straightLine.length);

  const slSchedule = straightLine.map((e) => ({
    year: e.year,
    depreciation: e.depreciation,
  }));

  const taxSavings = calculateTaxSavings(accSchedule, slSchedule, taxRate);

  const costSegFirstYearSavings = taxSavings.length > 0 ? taxSavings[0].annualSavings : 0;
  const costSegFiveYearSavings = taxSavings
    .slice(0, 5)
    .reduce((sum, e) => sum + e.annualSavings, 0);
  const costSegTotalSavings = taxSavings.reduce((sum, e) => sum + e.annualSavings, 0);
  const reclassifiedPercentage = propertyValue > 0
    ? Math.round((reclassifiedAmount / propertyValue) * 100)
    : 0;

  // ── Refinance Calculation ──
  const currentMonthly = calculateMonthlyPayment(loanAmount, currentRate, remainingYears);
  const newMonthly = calculateMonthlyPayment(loanAmount, newRate, newTermYears);
  const monthlySavings = Math.round((currentMonthly - newMonthly) * 100) / 100;
  const refiBreakEvenMonths = monthlySavings > 0
    ? Math.ceil(closingCosts / monthlySavings)
    : 0;
  const comparisonYears = Math.min(remainingYears, newTermYears);
  const refiTotalSavings = Math.round(
    (monthlySavings * comparisonYears * 12 - closingCosts) * 100
  ) / 100;

  // ── Combined Analysis ──
  const annualRefiSavings = monthlySavings * 12;
  const totalYear1Benefit = Math.round(
    (costSegFirstYearSavings + annualRefiSavings - closingCosts) * 100
  ) / 100;

  // Calculate 5-year benefit
  const totalFiveYearBenefit = Math.round(
    (costSegFiveYearSavings + annualRefiSavings * 5 - closingCosts) * 100
  ) / 100;

  // Loan paydown scenario: apply Year 1 cost seg savings as lump-sum to principal
  // after the first year of the new loan
  const r = newRate > 0 ? newRate / 100 / 12 : 0;
  const n = newTermYears * 12;

  // Track two loan balances: with and without the cost seg paydown
  let balanceWithout = loanAmount;
  let balanceWith = loanAmount;
  let interestWithout = 0;
  let interestWith = 0;
  let monthsPaidWith = 0;
  let monthsPaidWithout = 0;

  const combinedSchedule: CombinedYearEntry[] = [];
  let cumulativeBenefit = -closingCosts; // Start negative (closing costs)

  for (let year = 1; year <= comparisonYears; year++) {
    const yearCostSegSavings = year <= taxSavings.length ? taxSavings[year - 1].annualSavings : 0;
    const yearRefiSavings = annualRefiSavings;
    const combined = Math.round((yearCostSegSavings + yearRefiSavings) * 100) / 100;
    cumulativeBenefit = Math.round((cumulativeBenefit + combined) * 100) / 100;

    // Simulate 12 months for both balances
    for (let m = 0; m < 12; m++) {
      if (balanceWithout > 0) {
        const intWithout = balanceWithout * r;
        const princWithout = Math.min(newMonthly - intWithout, balanceWithout);
        interestWithout += intWithout;
        balanceWithout = Math.max(0, balanceWithout - princWithout);
        monthsPaidWithout++;
      }
      if (balanceWith > 0) {
        const intWith = balanceWith * r;
        const princWith = Math.min(newMonthly - intWith, balanceWith);
        interestWith += intWith;
        balanceWith = Math.max(0, balanceWith - princWith);
        monthsPaidWith++;
      }
    }

    // Apply cost seg savings as lump-sum principal payment at end of year
    if (balanceWith > 0 && yearCostSegSavings > 0) {
      const paydown = Math.min(yearCostSegSavings, balanceWith);
      balanceWith = Math.max(0, balanceWith - paydown);
    }

    combinedSchedule.push({
      year,
      costSegSavings: Math.round(yearCostSegSavings * 100) / 100,
      refiSavings: Math.round(yearRefiSavings * 100) / 100,
      combinedSavings: combined,
      cumulativeBenefit,
      loanBalanceWithPaydown: Math.round(balanceWith * 100) / 100,
      loanBalanceWithout: Math.round(balanceWithout * 100) / 100,
    });
  }

  const monthsSaved = monthsPaidWithout - monthsPaidWith;
  const additionalInterestSaved = Math.round((interestWithout - interestWith) * 100) / 100;

  return {
    costSegFirstYearSavings: Math.round(costSegFirstYearSavings * 100) / 100,
    costSegFiveYearSavings: Math.round(costSegFiveYearSavings * 100) / 100,
    costSegTotalSavings: Math.round(costSegTotalSavings * 100) / 100,
    reclassifiedPercentage,
    currentMonthlyPayment: Math.round(currentMonthly * 100) / 100,
    newMonthlyPayment: Math.round(newMonthly * 100) / 100,
    monthlySavings,
    refiBreakEvenMonths,
    refiTotalSavings,
    totalYear1Benefit,
    totalFiveYearBenefit,
    monthsSavedOnMortgage: monthsSaved,
    additionalInterestSaved,
    combinedSchedule,
  };
}
