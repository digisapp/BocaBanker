import { describe, it, expect } from 'vitest';
import { calculateBonusDepreciation, getBonusRateForYear } from './bonus-depreciation';
import { defaultPlacedInServiceYear, placedInServiceMonthFor } from './placed-in-service';

describe('calculateBonusDepreciation', () => {
  it('returns zeros for zero cost basis', () => {
    const result = calculateBonusDepreciation(0, 5);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(0);
    expect(result.firstYearTotal).toBe(0);
  });

  it('applies 100% bonus for 5-year property', () => {
    const result = calculateBonusDepreciation(100_000, 5, 100);
    expect(result.bonusAmount).toBe(100_000);
    expect(result.remainingBasis).toBe(0);
    // First year total = bonus + MACRS on $0
    expect(result.firstYearTotal).toBe(100_000);
  });

  it('applies 100% bonus for 7-year property', () => {
    const result = calculateBonusDepreciation(200_000, 7, 100);
    expect(result.bonusAmount).toBe(200_000);
    expect(result.firstYearTotal).toBe(200_000);
  });

  it('applies 100% bonus for 15-year property', () => {
    const result = calculateBonusDepreciation(500_000, 15, 100);
    expect(result.bonusAmount).toBe(500_000);
  });

  it('does NOT apply bonus for 27.5-year property', () => {
    const result = calculateBonusDepreciation(1_000_000, 27.5, 100);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(1_000_000);
  });

  it('does NOT apply bonus for 39-year property', () => {
    const result = calculateBonusDepreciation(1_000_000, 39, 100);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(1_000_000);
  });

  it('applies partial bonus (60%)', () => {
    const result = calculateBonusDepreciation(100_000, 5, 60);
    expect(result.bonusAmount).toBe(60_000);
    expect(result.remainingBasis).toBe(40_000);
    // First year: $60K bonus + 20% MACRS on $40K = $60K + $8K = $68K
    expect(result.firstYearTotal).toBeCloseTo(68_000, 0);
  });

  it('applies zero bonus rate', () => {
    const result = calculateBonusDepreciation(100_000, 5, 0);
    expect(result.bonusAmount).toBe(0);
    expect(result.remainingBasis).toBe(100_000);
    // First year = just MACRS year 1: 20% of $100K = $20K
    expect(result.firstYearTotal).toBeCloseTo(20_000, 0);
  });

  it('defaults to 100% bonus rate', () => {
    const result = calculateBonusDepreciation(100_000, 5);
    expect(result.bonusAmount).toBe(100_000);
  });
});

describe('getBonusRateForYear (historical Section 168(k) rates)', () => {
  it('no bonus before 2001 or for 2005-2007', () => {
    expect(getBonusRateForYear(2000)).toBe(0);
    expect(getBonusRateForYear(2005)).toBe(0);
    expect(getBonusRateForYear(2007, '2007-03-01')).toBe(0);
  });

  it('2001-2004: 30% (JCWAA), 50% if acquired after May 5, 2003 (JGTRRA)', () => {
    expect(getBonusRateForYear(2001)).toBe(0);
    expect(getBonusRateForYear(2001, '2001-09-11')).toBe(30);
    expect(getBonusRateForYear(2002)).toBe(30);
    expect(getBonusRateForYear(2003, '2003-05-05')).toBe(30);
    expect(getBonusRateForYear(2003, '2003-05-06')).toBe(50);
    expect(getBonusRateForYear(2004)).toBe(50);
  });

  it('2008-2016: 50%, 100% for property acquired after Sept 8, 2010 and in service by 2011', () => {
    expect(getBonusRateForYear(2008)).toBe(50);
    expect(getBonusRateForYear(2009, '2007-12-31')).toBe(0); // acquired before 2008
    expect(getBonusRateForYear(2010)).toBe(50);
    expect(getBonusRateForYear(2010, '2010-09-08')).toBe(50);
    expect(getBonusRateForYear(2010, '2010-09-09')).toBe(100);
    expect(getBonusRateForYear(2011)).toBe(100);
    expect(getBonusRateForYear(2011, '2010-06-01')).toBe(50);
    expect(getBonusRateForYear(2012, '2011-06-01')).toBe(50);
    expect(getBonusRateForYear(2016)).toBe(50); // PATH Act, not 100%
  });

  it('2017: 50% unless acquired after Sept 27, 2017 (TCJA)', () => {
    expect(getBonusRateForYear(2017)).toBe(50);
    expect(getBonusRateForYear(2017, '2017-09-27')).toBe(50);
    expect(getBonusRateForYear(2017, '2017-09-28')).toBe(100);
  });

  it('pre-TCJA acquisitions keep the PATH Act phase-down', () => {
    expect(getBonusRateForYear(2018, '2017-06-01')).toBe(40);
    expect(getBonusRateForYear(2019, '2017-06-01')).toBe(30);
    expect(getBonusRateForYear(2020, '2017-06-01')).toBe(0);
    expect(getBonusRateForYear(2024, '2017-06-01')).toBe(0);
    expect(getBonusRateForYear(2025, '2017-06-01')).toBe(0);
  });

  it('2018-2022: 100% for property acquired after Sept 27, 2017', () => {
    expect(getBonusRateForYear(2018)).toBe(100);
    expect(getBonusRateForYear(2020, '2019-04-15')).toBe(100);
    expect(getBonusRateForYear(2022, '2017-09-28')).toBe(100);
  });

  it('2025: 40% for property acquired before Jan 20, 2025, 100% after (OBBBA)', () => {
    expect(getBonusRateForYear(2025, '2025-01-10')).toBe(40);
    expect(getBonusRateForYear(2025, '2025-01-20')).toBe(100);
  });
});

describe('study defaults: placed-in-service year and bonus rate', () => {
  // What the study form does: year = purchase year unless edited, bonus =
  // getBonusRateForYear(study year, purchase date).
  const defaultRate = (purchaseDate: string | null, studyYear?: number) =>
    getBonusRateForYear(studyYear ?? defaultPlacedInServiceYear(purchaseDate, 2026), purchaseDate);

  it('defaults the placed-in-service year to the purchase year', () => {
    expect(defaultPlacedInServiceYear('2024-12-15', 2026)).toBe(2024);
    expect(defaultPlacedInServiceYear('2019-06-15', 2026)).toBe(2019);
    expect(defaultPlacedInServiceYear(null, 2026)).toBe(2026);
    expect(defaultPlacedInServiceYear(undefined, 2026)).toBe(2026);
    expect(defaultPlacedInServiceYear('not a date', 2026)).toBe(2026);
    // outside the accepted study-year range (2000-2100)
    expect(defaultPlacedInServiceYear('1998-05-01', 2026)).toBe(2026);
  });

  it('bought and placed in service the same year', () => {
    expect(defaultRate('2025-01-10')).toBe(40); // before OBBBA's Jan 20, 2025
    expect(defaultRate('2025-03-01')).toBe(100);
    expect(defaultRate('2024-06-01')).toBe(60);
    expect(defaultRate('2019-06-15')).toBe(100); // look-back: year defaults to 2019
    expect(defaultRate('2016-08-01')).toBe(50);
    expect(defaultRate(null)).toBe(100); // 2026, no acquisition date: OBBBA
  });

  it('acquired Dec 2024, placed in service 2025 = 40% (not 2024\'s 60%)', () => {
    expect(defaultRate('2024-12-15', 2025)).toBe(40);
  });

  it('acquired 2024, placed in service 2026 = TCJA 20%', () => {
    expect(defaultRate('2024-03-01', 2026)).toBe(20);
  });

  it('acquired after Jan 19, 2025 and placed in service later = 100%', () => {
    expect(defaultRate('2025-11-01', 2026)).toBe(100);
  });
});

describe('placedInServiceMonthFor', () => {
  it('uses the purchase month when bought in the placed-in-service year', () => {
    expect(placedInServiceMonthFor(2025, '2025-11-03')).toBe(11);
    expect(placedInServiceMonthFor(2025, '2025-01-31')).toBe(1);
  });

  it('defaults to January otherwise', () => {
    expect(placedInServiceMonthFor(2025, '2024-11-03')).toBe(1);
    expect(placedInServiceMonthFor(2025, null)).toBe(1);
    expect(placedInServiceMonthFor(2025, '2025-13-01')).toBe(1);
  });
});
