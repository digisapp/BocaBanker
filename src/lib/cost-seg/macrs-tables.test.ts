import { describe, it, expect } from 'vitest';
import {
  MACRS_5_YEAR,
  MACRS_7_YEAR,
  MACRS_15_YEAR,
  MACRS_27_5_YEAR,
  MACRS_39_YEAR,
  getMacrsRates,
  type MacrsRecoveryPeriod,
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
