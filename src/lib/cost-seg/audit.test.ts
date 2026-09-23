import { describe, it, expect } from 'vitest';
import { getMacrsRates, MACRS_27_5_YEAR, MACRS_39_YEAR } from './macrs-tables';
import { calculateDepreciation, calculateStraightLineDepreciation } from './depreciation';
import { calculateBonusDepreciation, getBonusRateForYear } from './bonus-depreciation';
import { getAllocationFromBuildingValue } from './asset-classes';
import { generateStudyReport } from './report-generator';

const sum = (rates: readonly number[]) => rates.reduce((s, r) => s + r, 0);

describe('mid-month convention by placed-in-service month (Pub 946 A-6 / A-7a)', () => {
  const FIRST_27_5 = [3.485, 3.182, 2.879, 2.576, 2.273, 1.970, 1.667, 1.364, 1.061, 0.758, 0.455, 0.152];
  const FIRST_39 = [2.461, 2.247, 2.033, 1.819, 1.605, 1.391, 1.177, 0.963, 0.749, 0.535, 0.321, 0.107];

  for (let month = 1; month <= 12; month++) {
    it(`27.5-year month ${month}: first year, length, and sums to 100%`, () => {
      const t = getMacrsRates(27.5, month);
      expect(t[0]).toBe(FIRST_27_5[month - 1]);
      expect(t).toHaveLength(month <= 6 ? 28 : 29);
      expect(sum(t)).toBeCloseTo(100, 6);
    });

    it(`39-year month ${month}: first year, length, and sums to 100%`, () => {
      const t = getMacrsRates(39, month);
      expect(t[0]).toBe(FIRST_39[month - 1]);
      expect(t).toHaveLength(40);
      expect(t[39]).toBe(FIRST_39[12 - month]);
      expect(sum(t)).toBeCloseTo(100, 6);
    });
  }

  it('27.5-year spot checks against Table A-6', () => {
    const jul = getMacrsRates(27.5, 7);
    expect(jul[9]).toBe(3.636); // year 10
    expect(jul[10]).toBe(3.637); // year 11
    expect(jul[27]).toBe(3.636); // year 28
    expect(jul[28]).toBe(0.152); // year 29
    const jun = getMacrsRates(27.5, 6);
    expect(jun[9]).toBe(3.637);
    expect(jun[27]).toBe(3.485);
  });

  it('month 1 matches the static tables; invalid months fall back to month 1', () => {
    expect(getMacrsRates(27.5, 1)).toEqual([...MACRS_27_5_YEAR]);
    expect(getMacrsRates(39, 1)).toEqual([...MACRS_39_YEAR]);
    expect(getMacrsRates(39, 0)).toEqual([...MACRS_39_YEAR]);
    expect(getMacrsRates(39, 13)).toEqual([...MACRS_39_YEAR]);
    expect(getMacrsRates(39, NaN)).toEqual([...MACRS_39_YEAR]);
  });

  it('half-year property ignores the month', () => {
    expect(getMacrsRates(5, 10)).toEqual(getMacrsRates(5, 1));
  });

  it('October 39-year first-year deduction is 0.535%, not 2.461%', () => {
    const s = calculateStraightLineDepreciation(1_000_000, 39, 10);
    expect(s[0].depreciation).toBe(5_350);
    expect(s[39].cumulativeDepreciation).toBe(1_000_000);
  });
});

describe('calculateDepreciation robustness', () => {
  it('always depreciates exactly the full basis to the cent', () => {
    for (const basis of [123_456.78, 99_999.99, 1_000_001.01, 3_333.33]) {
      for (const period of [5, 7, 15, 27.5, 39] as const) {
        const s = calculateDepreciation(basis, period, 0);
        const total = s.reduce((acc, e) => acc + e.depreciation, 0);
        expect(Math.round(total * 100) / 100).toBe(basis);
        expect(s[s.length - 1].remainingBasis).toBe(0);
        expect(s[s.length - 1].cumulativeDepreciation).toBe(basis);
      }
    }
  });

  it('clamps bonus rates outside 0-100 (no negative MACRS)', () => {
    const s = calculateDepreciation(100_000, 7, 150);
    expect(s[0].depreciation).toBe(100_000);
    expect(s.every((e) => e.depreciation >= 0)).toBe(true);
    const neg = calculateDepreciation(100_000, 7, -20);
    expect(neg[0].depreciation).toBe(14_290);
  });

  it('returns an empty schedule for NaN / Infinity basis', () => {
    expect(calculateDepreciation(NaN, 5)).toEqual([]);
    expect(calculateDepreciation(Infinity, 5)).toEqual([]);
  });

  it('bonus calc returns zeros for NaN basis and treats NaN rate as 0%', () => {
    expect(calculateBonusDepreciation(NaN, 5).firstYearTotal).toBe(0);
    expect(calculateBonusDepreciation(100_000, 5, NaN).bonusAmount).toBe(0);
  });
});

describe('getBonusRateForYear (TCJA phase-down vs OBBBA)', () => {
  it('TCJA phase-down by placed-in-service year', () => {
    expect(getBonusRateForYear(2022)).toBe(100);
    expect(getBonusRateForYear(2023)).toBe(80);
    expect(getBonusRateForYear(2024)).toBe(60);
  });

  it('property acquired before Jan 20, 2025 stays on the phase-down', () => {
    expect(getBonusRateForYear(2025, '2025-01-19')).toBe(40);
    expect(getBonusRateForYear(2025, '2024-11-01')).toBe(40);
    expect(getBonusRateForYear(2026, '2024-06-30')).toBe(20);
    expect(getBonusRateForYear(2027, '2024-06-30')).toBe(0);
  });

  it('property acquired after Jan 19, 2025 gets permanent 100%', () => {
    expect(getBonusRateForYear(2025, '2025-01-20')).toBe(100);
    expect(getBonusRateForYear(2027, new Date(2026, 2, 1))).toBe(100);
    expect(getBonusRateForYear(2025)).toBe(100); // no acquisition date: assume post-OBBBA
  });
});

describe('getAllocationFromBuildingValue', () => {
  it('splits the actual building value (not 80% of price) across classes', () => {
    // $1M purchase, $700k building / $300k land (30% land, not the default 20%)
    const alloc = getAllocationFromBuildingValue('commercial', 700_000, 300_000, 1_000_000);
    const depreciable = alloc.filter((a) => a.recoveryPeriod > 0);
    expect(depreciable.reduce((s, a) => s + a.amount, 0)).toBeCloseTo(700_000, 2);
    expect(alloc.find((a) => a.category === 'land')!.amount).toBe(300_000);
    // 5-yr keeps its 8/80 share of the building
    expect(alloc.find((a) => a.category === 'personal_property_5yr')!.amount).toBe(70_000);
  });

  it('sums to the cent for awkward building values', () => {
    const alloc = getAllocationFromBuildingValue('hospitality', 1_234_567.89, null, 1_500_000);
    const depreciable = alloc.filter((a) => a.recoveryPeriod > 0);
    const cents = depreciable.reduce((s, a) => s + Math.round(a.amount * 100), 0);
    expect(cents).toBe(123_456_789);
    expect(alloc.find((a) => a.category === 'land')!.amount).toBeCloseTo(265_432.11, 2);
  });

  it('yields zero spurious savings: lifetime savings net to ~0 against the baseline', () => {
    const alloc = getAllocationFromBuildingValue('commercial', 700_000, 300_000, 1_000_000);
    const report = generateStudyReport({
      propertyAddress: 'x',
      propertyType: 'commercial',
      purchasePrice: 1_000_000,
      buildingValue: 700_000,
      landValue: 300_000,
      studyYear: 2025,
      taxRate: 37,
      discountRate: 5,
      bonusDepreciationRate: 100,
      assets: alloc.map((a) => ({
        category: a.category,
        costBasis: a.amount,
        recoveryPeriod: a.recoveryPeriod,
      })),
    });
    const last = report.taxSavingsSchedule[report.taxSavingsSchedule.length - 1];
    expect(Math.abs(last.cumulativeSavings)).toBeLessThan(1);
  });
});

describe('generateStudyReport placed-in-service month', () => {
  const base = {
    propertyAddress: 'x',
    propertyType: 'commercial',
    purchasePrice: 1_000_000,
    buildingValue: 800_000,
    landValue: 200_000,
    studyYear: 2025,
    taxRate: 37,
    discountRate: 5,
    bonusDepreciationRate: 0,
    assets: [
      { category: 'building_39yr', costBasis: 800_000, recoveryPeriod: 39 },
      { category: 'land', costBasis: 200_000, recoveryPeriod: 0 },
    ],
  };

  it('uses the month column for real property first-year deduction', () => {
    const jan = generateStudyReport(base);
    const oct = generateStudyReport({ ...base, placedInServiceMonth: 10 });
    expect(jan.firstYearAnalysis.totalFirstYear).toBe(19_688); // 800k x 2.461%
    expect(oct.firstYearAnalysis.totalFirstYear).toBe(4_280); // 800k x 0.535%
    expect(oct.depreciationSchedule[0].straightLine).toBe(4_280);
  });
});
