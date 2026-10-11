import { describe, it, expect } from 'vitest';
import {
  MACRS_5_YEAR,
  MACRS_7_YEAR,
  MACRS_15_YEAR,
  MACRS_27_5_YEAR,
  MACRS_39_YEAR,
  MACRS_MID_QUARTER,
  getMacrsRates,
  quarterForMonth,
  type MacrsRecoveryPeriod,
  type PlacedInServiceQuarter,
} from './macrs-tables';

const sum = (rates: readonly number[]) => rates.reduce((s, r) => s + r, 0);

describe('MACRS table integrity', () => {
  const tables: { name: string; table: readonly number[]; expectedLength: number }[] = [
    { name: '5-year', table: MACRS_5_YEAR, expectedLength: 6 },
    { name: '7-year', table: MACRS_7_YEAR, expectedLength: 8 },
    { name: '15-year', table: MACRS_15_YEAR, expectedLength: 16 },
    { name: '27.5-year', table: MACRS_27_5_YEAR, expectedLength: 28 },
    { name: '39-year', table: MACRS_39_YEAR, expectedLength: 40 },
  ];

  for (const { name, table, expectedLength } of tables) {
    it(`${name} table sums to 100% (within 0.01)`, () => {
      expect(Math.abs(sum(table) - 100)).toBeLessThan(0.01);
    });

    it(`${name} table has ${expectedLength} entries`, () => {
      expect(table).toHaveLength(expectedLength);
    });

    it(`${name} table has only positive rates`, () => {
      for (const rate of table) {
        expect(rate).toBeGreaterThan(0);
      }
    });
  }

  it('getMacrsRates returns columns that sum to 100% for every valid period', () => {
    const periods: MacrsRecoveryPeriod[] = [5, 7, 15, 27.5, 39];
    for (const period of periods) {
      expect(Math.abs(sum(getMacrsRates(period)) - 100)).toBeLessThan(0.01);
    }
  });
});

describe('MACRS spot checks against IRS Pub 946', () => {
  it('5-year (Table A-1): year 1 = 20%, year 2 = 32%, year 6 = 5.76%', () => {
    expect(MACRS_5_YEAR[0]).toBe(20.0);
    expect(MACRS_5_YEAR[1]).toBe(32.0);
    expect(MACRS_5_YEAR[5]).toBe(5.76);
  });

  it('7-year (Table A-1): year 1 = 14.29%, year 8 = 4.46%', () => {
    expect(MACRS_7_YEAR[0]).toBe(14.29);
    expect(MACRS_7_YEAR[7]).toBe(4.46);
  });

  it('15-year (Table A-1): year 1 = 5.00%, year 16 = 2.95%', () => {
    expect(MACRS_15_YEAR[0]).toBe(5.0);
    expect(MACRS_15_YEAR[15]).toBe(2.95);
  });

  it('27.5-year (Table A-6, month 1): year 1 = 3.485%, year 10 = 3.637%, year 28 = 1.97%', () => {
    expect(MACRS_27_5_YEAR[0]).toBe(3.485);
    expect(MACRS_27_5_YEAR[9]).toBe(3.637); // alternation starts in year 10
    expect(MACRS_27_5_YEAR[26]).toBe(3.636); // year 27
    expect(MACRS_27_5_YEAR[27]).toBe(1.97);
  });

  it('39-year (Table A-7a, month 1): year 1 = 2.461%, years 2-39 = 2.564%, year 40 = 0.107%', () => {
    expect(MACRS_39_YEAR[0]).toBe(2.461);
    for (let y = 1; y < 39; y++) {
      expect(MACRS_39_YEAR[y]).toBe(2.564);
    }
    expect(MACRS_39_YEAR[39]).toBe(0.107);
  });
});

describe('getMacrsRates', () => {
  it('returns a defensive copy', () => {
    const rates = getMacrsRates(5);
    rates[0] = 999;
    expect(getMacrsRates(5)[0]).toBe(20.0);
  });

  it('throws on invalid recovery period', () => {
    expect(() => getMacrsRates(10 as MacrsRecoveryPeriod)).toThrow(/Invalid MACRS recovery period/);
  });
});

/**
 * Independent derivation of a GDS percentage column the way the IRS builds
 * the Pub 946 tables, in exact integer hundredths of a percent (no floating
 * point drift): year 1 = DB rate x the first-year fraction; every later
 * year takes the larger of declining balance on the remaining basis and
 * straight line over the remaining recovery period, rounded to 0.01% with
 * the rounded remainder carried forward; the final year takes what is left.
 *
 * @param n - recovery period in years
 * @param dbPercent - 200 (5/7-year) or 150 (15-year) declining balance
 * @param firstYearEighths - first-year fraction in eighths of a year:
 *   4 = half-year; 7/5/3/1 = mid-quarter Q1/Q2/Q3/Q4 (87.5/62.5/37.5/12.5%)
 */
function deriveColumn(n: number, dbPercent: number, firstYearEighths: number): number[] {
  // round(num / den), halves up; exact for these small integers
  const roundDiv = (num: number, den: number) => Math.floor((2 * num + den) / (2 * den));
  let remaining = 10_000; // 100.00%
  const column: number[] = [];
  const year1 = roundDiv(10_000 * firstYearEighths * dbPercent, 8 * 100 * n);
  column.push(year1);
  remaining -= year1;
  for (let year = 2; remaining > 0; year++) {
    const lifeLeftEighths = 8 * n - firstYearEighths - 8 * (year - 2);
    if (lifeLeftEighths <= 8) {
      column.push(remaining);
      break;
    }
    // straight line (remaining / life left) vs DB (remaining x dbPercent / 100n)
    const straightLine = 8 * 100 * n >= dbPercent * lifeLeftEighths;
    const amount = straightLine
      ? roundDiv(remaining * 8, lifeLeftEighths)
      : roundDiv(remaining * dbPercent, 100 * n);
    column.push(amount);
    remaining -= amount;
  }
  return column.map((hundredths) => hundredths / 100);
}

const QUARTERS: PlacedInServiceQuarter[] = [1, 2, 3, 4];
const FIRST_YEAR_EIGHTHS: Record<PlacedInServiceQuarter, number> = { 1: 7, 2: 5, 3: 3, 4: 1 };
const PERSONAL: { period: 5 | 7 | 15; db: number; length: number }[] = [
  { period: 5, db: 200, length: 6 },
  { period: 7, db: 200, length: 8 },
  { period: 15, db: 150, length: 16 },
];
const toHundredths = (rates: readonly number[]) => rates.map((r) => Math.round(r * 100));

describe('table derivation method', () => {
  it('reproduces the half-year tables (Pub 946 Table A-1)', () => {
    expect(deriveColumn(5, 200, 4)).toEqual([...MACRS_5_YEAR]);
    expect(deriveColumn(7, 200, 4)).toEqual([...MACRS_7_YEAR]);
    expect(deriveColumn(15, 150, 4)).toEqual([...MACRS_15_YEAR]);
  });
});

// The one place Pub 946 departs from the derivation: 7-year Q2 year 1 is
// printed as 17.85 (derived: 17.86), so that column sums to 99.99.
const PUBLISHED_DIFFERENCES: Record<string, Record<number, number>> = { '7-2': { 0: 17.85 } };

function asPublished(period: number, q: number, column: number[]): number[] {
  const out = [...column];
  for (const [i, v] of Object.entries(PUBLISHED_DIFFERENCES[`${period}-${q}`] ?? {})) out[Number(i)] = v;
  return out;
}

describe('mid-quarter tables (Pub 946 Tables A-2 to A-5)', () => {
  for (const { period, db, length } of PERSONAL) {
    for (const q of QUARTERS) {
      const table = MACRS_MID_QUARTER[period][q];
      const expectedTotal = period === 7 && q === 2 ? 9_999 : 10_000;

      it(`${period}-year Q${q}: ${length} entries summing to ${expectedTotal / 100}%`, () => {
        expect(table).toHaveLength(length);
        expect(toHundredths(table).reduce((s, r) => s + r, 0)).toBe(expectedTotal);
        for (const rate of table) expect(rate).toBeGreaterThan(0);
      });

      it(`${period}-year Q${q}: every value matches an independent derivation`, () => {
        expect([...table]).toEqual(asPublished(period, q, deriveColumn(period, db, FIRST_YEAR_EIGHTHS[q])));
      });
    }
  }

  it('year 1 is 87.5% / 62.5% / 37.5% / 12.5% of a full year of DB', () => {
    expect(QUARTERS.map((q) => MACRS_MID_QUARTER[5][q][0])).toEqual([35, 25, 15, 5]);
    expect(QUARTERS.map((q) => MACRS_MID_QUARTER[7][q][0])).toEqual([25, 17.85, 10.71, 3.57]);
    expect(QUARTERS.map((q) => MACRS_MID_QUARTER[15][q][0])).toEqual([8.75, 6.25, 3.75, 1.25]);
  });

  it('matches published values', () => {
    expect(MACRS_MID_QUARTER[5][4]).toEqual([5.0, 38.0, 22.8, 13.68, 10.94, 9.58]);
    expect(MACRS_MID_QUARTER[5][1]).toEqual([35.0, 26.0, 15.6, 11.01, 11.01, 1.38]);
    expect(MACRS_MID_QUARTER[7][1]).toEqual([25.0, 21.43, 15.31, 10.93, 8.75, 8.74, 8.75, 1.09]);
    expect(MACRS_MID_QUARTER[7][4]).toEqual([3.57, 27.55, 19.68, 14.06, 10.04, 8.73, 8.73, 7.64]);
    expect(MACRS_MID_QUARTER[7][2]).toEqual([17.85, 23.47, 16.76, 11.97, 8.87, 8.87, 8.87, 3.33]);
    expect(MACRS_MID_QUARTER[15][4].slice(0, 4)).toEqual([1.25, 9.88, 8.89, 8.0]);
    expect(MACRS_MID_QUARTER[15][4][15]).toBe(5.17);
    expect(MACRS_MID_QUARTER[15][1][15]).toBe(0.74);
  });
});

describe('getMacrsRates with the mid-quarter convention', () => {
  it('picks the column for the quarter of the placed-in-service month', () => {
    const months: [number, PlacedInServiceQuarter][] = [
      [1, 1], [3, 1], [4, 2], [6, 2], [7, 3], [9, 3], [10, 4], [12, 4],
    ];
    for (const [month, q] of months) {
      expect(quarterForMonth(month)).toBe(q);
      expect(getMacrsRates(5, month, true)).toEqual([...MACRS_MID_QUARTER[5][q]]);
      expect(getMacrsRates(7, month, true)).toEqual([...MACRS_MID_QUARTER[7][q]]);
      expect(getMacrsRates(15, month, true)).toEqual([...MACRS_MID_QUARTER[15][q]]);
    }
  });

  it('leaves real property on the mid-month convention', () => {
    expect(getMacrsRates(39, 11, true)).toEqual(getMacrsRates(39, 11));
    expect(getMacrsRates(27.5, 11, true)).toEqual(getMacrsRates(27.5, 11));
  });

  it('is off by default (half-year tables)', () => {
    expect(getMacrsRates(5, 11)).toEqual([...MACRS_5_YEAR]);
    expect(getMacrsRates(5, 11, false)).toEqual([...MACRS_5_YEAR]);
  });

  it('treats an invalid month as January (Q1)', () => {
    expect(getMacrsRates(5, 0, true)).toEqual([...MACRS_MID_QUARTER[5][1]]);
    expect(getMacrsRates(5, 13, true)).toEqual([...MACRS_MID_QUARTER[5][1]]);
  });

  it('returns a defensive copy', () => {
    const rates = getMacrsRates(5, 12, true);
    rates[0] = 999;
    expect(MACRS_MID_QUARTER[5][4][0]).toBe(5.0);
  });
});
