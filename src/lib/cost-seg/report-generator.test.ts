import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDefaultAllocation } from './asset-classes';
import { generateStudyReport } from './report-generator';

// $1M commercial, no building value on record: the study form seeds the
// assets from getDefaultAllocation(purchase price) — $250k of 5/7/15-year
// property, $550k 39-year building, $200k land.
//
// Expected values worked by hand (37%, 100% bonus, January, 5% discount):
//   with cost seg, yr 1:  250,000 + 550,000 x 2.461% = 263,535.50 -> tax 97,508.14
//   straight-line, yr 1:  800,000 x 2.461%           =  19,688.00 -> tax  7,284.56
//   yr-1 savings = 90,223.58; yrs 2-39 = (14,102 - 20,512) x 37% = -2,371.70
//   yr 40 = 217.75 - 316.72 = -98.97; NPV at 5% = 47,812.61
const base = {
  propertyAddress: 'x',
  propertyType: 'commercial',
  purchasePrice: 1_000_000,
  buildingValue: 0,
  landValue: 0,
  studyYear: 2025,
  taxRate: 37,
  discountRate: 5,
  bonusDepreciationRate: 100,
  assets: getDefaultAllocation('commercial', 1_000_000).map((a) => ({
    category: a.category,
    costBasis: a.amount,
    recoveryPeriod: a.recoveryPeriod,
  })),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateStudyReport without a building value', () => {
  it('baselines against the depreciable asset basis (purchase price minus land)', () => {
    const report = generateStudyReport(base);
    expect(report.depreciationSchedule[0].straightLine).toBe(19_688);
    expect(report.taxSavingsSchedule[0].withoutCostSeg).toBe(7_284.56);
    // Previously the baseline was empty: $296,000 "total" / $176,717 NPV
    expect(report.summary.totalTaxSavings).toBe(90_223.58);
    expect(report.summary.npvTaxSavings).toBeCloseTo(47_812.61, 1);
  });

  it('lifetime savings net to ~0 (pure timing benefit)', () => {
    const report = generateStudyReport(base);
    const last = report.taxSavingsSchedule[report.taxSavingsSchedule.length - 1];
    expect(Math.abs(last.cumulativeSavings)).toBeLessThan(1);
  });

  it('matches the report for the same building value given explicitly', () => {
    const implicit = generateStudyReport(base);
    const explicit = generateStudyReport({ ...base, buildingValue: 800_000, landValue: 200_000 });
    expect(implicit.summary).toEqual(explicit.summary);
    expect(implicit.taxSavingsSchedule).toEqual(explicit.taxSavingsSchedule);
  });

  it('warns when the assets do not add up to the purchase price', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    generateStudyReport(base);
    expect(warn).not.toHaveBeenCalled();

    generateStudyReport({
      ...base,
      assets: base.assets.filter((a) => a.category !== 'land'),
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('No building value');
  });
});

describe('generateStudyReport first-year savings', () => {
  it('is the year-1 savings vs. straight-line, not the gross tax value of the deduction', () => {
    const report = generateStudyReport(base);
    // Gross value of the year-1 deduction would be 263,535.50 x 37% = 97,508.14
    expect(report.firstYearAnalysis.totalFirstYear).toBe(263_535.5);
    expect(report.firstYearAnalysis.taxSavings).toBe(90_223.58);
    expect(report.firstYearAnalysis.taxSavings).toBe(report.taxSavingsSchedule[0].savings);
    // 90,223.58 / 1,000,000 (was 9.75%)
    expect(report.summary.effectiveRate).toBe(9.02);
  });

  it('is zero when nothing is reclassified', () => {
    const report = generateStudyReport({
      ...base,
      buildingValue: 800_000,
      assets: [
        { category: 'building_39yr', costBasis: 800_000, recoveryPeriod: 39 },
        { category: 'land', costBasis: 200_000, recoveryPeriod: 0 },
      ],
    });
    expect(report.firstYearAnalysis.taxSavings).toBe(0);
    expect(report.summary.effectiveRate).toBe(0);
  });
});

describe('generateStudyReport mid-quarter convention', () => {
  const noBonus = { ...base, bonusDepreciationRate: 0, placedInServiceMonth: 11 };

  it('is off by default and records the conventions used', () => {
    const report = generateStudyReport(noBonus);
    expect(report.assumptions).toEqual({
      placedInServiceYear: 2025,
      placedInServiceMonth: 11,
      placedInServiceQuarter: 4,
      midQuarterConvention: false,
    });
    expect(generateStudyReport({ ...noBonus, midQuarterConvention: false })).toEqual(report);
  });

  it('uses the Q4 tables for 5/7/15-year property and keeps mid-month for the building', () => {
    const halfYear = generateStudyReport(noBonus);
    const midQuarter = generateStudyReport({ ...noBonus, midQuarterConvention: true });
    expect(midQuarter.assumptions.midQuarterConvention).toBe(true);

    const personal = base.assets.filter((a) => [5, 7, 15].includes(a.recoveryPeriod));
    const q4Year1 = { 5: 0.05, 7: 0.0357, 15: 0.0125 } as Record<number, number>;
    const hyYear1 = { 5: 0.2, 7: 0.1429, 15: 0.05 } as Record<number, number>;
    const drop = personal.reduce(
      (sum, a) => sum + a.costBasis * (hyYear1[a.recoveryPeriod] - q4Year1[a.recoveryPeriod]),
      0
    );
    expect(halfYear.firstYearAnalysis.regularFirstYear - midQuarter.firstYearAnalysis.regularFirstYear)
      .toBeCloseTo(drop, 2);
    // the straight-line (no cost seg) baseline is real property: unchanged
    expect(midQuarter.depreciationSchedule.map((r) => r.straightLine)).toEqual(
      halfYear.depreciationSchedule.map((r) => r.straightLine)
    );
    // still depreciates the full basis
    const total = (r: typeof midQuarter) => r.depreciationSchedule.reduce((s, y) => s + y.accelerated, 0);
    expect(total(midQuarter)).toBeCloseTo(total(halfYear), 2);
  });

  it('a Q1 study front-loads personal property more than half-year', () => {
    const q1 = generateStudyReport({ ...noBonus, placedInServiceMonth: 2, midQuarterConvention: true });
    const hy = generateStudyReport({ ...noBonus, placedInServiceMonth: 2 });
    expect(q1.assumptions.placedInServiceQuarter).toBe(1);
    expect(q1.firstYearAnalysis.regularFirstYear).toBeGreaterThan(hy.firstYearAnalysis.regularFirstYear);
  });
});
