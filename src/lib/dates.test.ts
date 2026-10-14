import { describe, it, expect } from 'vitest'
import { businessPeriods, businessToday, businessYear, isDateInRange, startOfBusinessDay } from './dates'

const at = (iso: string) => new Date(iso)

describe('businessToday', () => {
  it('stays on the Eastern date after UTC midnight', () => {
    // 9:30pm EDT on Sep 30 is already Oct 1 in UTC
    expect(businessToday(at('2026-10-01T01:30:00Z'))).toBe('2026-09-30')
    // 11:59:59pm EDT, then midnight
    expect(businessToday(at('2026-10-01T03:59:59Z'))).toBe('2026-09-30')
    expect(businessToday(at('2026-10-01T04:00:00Z'))).toBe('2026-10-01')
  })

  it('handles the DST switches (midnight is 05:00Z in EST, 04:00Z in EDT)', () => {
    // Spring forward: Sun Mar 8 2026
    expect(businessToday(at('2026-03-08T04:59:59Z'))).toBe('2026-03-07')
    expect(businessToday(at('2026-03-08T05:00:00Z'))).toBe('2026-03-08')
    expect(businessToday(at('2026-03-08T07:00:00Z'))).toBe('2026-03-08') // 3am EDT
    expect(businessToday(at('2026-03-09T03:59:59Z'))).toBe('2026-03-08')
    expect(businessToday(at('2026-03-09T04:00:00Z'))).toBe('2026-03-09')
    // Fall back: Sun Nov 1 2026
    expect(businessToday(at('2026-11-01T03:59:59Z'))).toBe('2026-10-31')
    expect(businessToday(at('2026-11-01T04:00:00Z'))).toBe('2026-11-01')
    expect(businessToday(at('2026-11-02T04:59:59Z'))).toBe('2026-11-01')
    expect(businessToday(at('2026-11-02T05:00:00Z'))).toBe('2026-11-02')
  })
})

describe('businessYear', () => {
  it('is still the old year on the evening of Dec 31', () => {
    expect(businessYear(at('2027-01-01T04:59:59Z'))).toBe(2026)
    expect(businessYear(at('2027-01-01T05:00:00Z'))).toBe(2027)
  })
})

describe('businessPeriods', () => {
  it('keeps December on the evening of Dec 31', () => {
    // 8pm EST Dec 31 = 1am UTC Jan 1
    expect(businessPeriods(at('2027-01-01T01:00:00Z'))).toEqual({
      today: '2026-12-31',
      year: '2026',
      month: '2026-12',
      monthStart: '2026-12-01',
      nextMonthStart: '2027-01-01',
      yearStart: '2026-01-01',
      nextYearStart: '2027-01-01',
    })
    expect(businessPeriods(at('2027-01-01T05:00:00Z'))).toMatchObject({
      today: '2027-01-01',
      year: '2027',
      monthStart: '2027-01-01',
      nextMonthStart: '2027-02-01',
    })
  })

  it('keeps the old month on the last evening of a month', () => {
    expect(businessPeriods(at('2026-11-01T02:00:00Z'))).toMatchObject({
      today: '2026-10-31',
      month: '2026-10',
      monthStart: '2026-10-01',
      nextMonthStart: '2026-11-01',
    })
    // Leap day evening (EST)
    expect(businessPeriods(at('2028-03-01T04:30:00Z'))).toMatchObject({
      today: '2028-02-29',
      monthStart: '2028-02-01',
      nextMonthStart: '2028-03-01',
    })
  })
})

describe('isDateInRange', () => {
  it('is inclusive of start and exclusive of end', () => {
    expect(isDateInRange('2026-10-01', '2026-10-01', '2026-11-01')).toBe(true)
    expect(isDateInRange('2026-10-31', '2026-10-01', '2026-11-01')).toBe(true)
    expect(isDateInRange('2026-11-01', '2026-10-01', '2026-11-01')).toBe(false)
    expect(isDateInRange('2026-09-30', '2026-10-01', '2026-11-01')).toBe(false)
    expect(isDateInRange(null, '2026-10-01', '2026-11-01')).toBe(false)
    expect(isDateInRange('', '2026-10-01', '2026-11-01')).toBe(false)
  })
})

describe('startOfBusinessDay', () => {
  it('returns Eastern midnight as a UTC instant', () => {
    expect(startOfBusinessDay('2026-10-01').toISOString()).toBe('2026-10-01T04:00:00.000Z')
    expect(startOfBusinessDay('2026-12-01').toISOString()).toBe('2026-12-01T05:00:00.000Z')
    expect(startOfBusinessDay('2027-01-01').toISOString()).toBe('2027-01-01T05:00:00.000Z')
  })

  it('uses the offset in force at midnight around DST switches', () => {
    expect(startOfBusinessDay('2026-03-08').toISOString()).toBe('2026-03-08T05:00:00.000Z')
    expect(startOfBusinessDay('2026-03-09').toISOString()).toBe('2026-03-09T04:00:00.000Z')
    expect(startOfBusinessDay('2026-11-01').toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(startOfBusinessDay('2026-11-02').toISOString()).toBe('2026-11-02T05:00:00.000Z')
  })

  it('round-trips with businessToday', () => {
    for (const day of ['2026-01-01', '2026-03-08', '2026-07-04', '2026-11-01', '2026-12-31']) {
      const start = startOfBusinessDay(day)
      expect(businessToday(start)).toBe(day)
      expect(businessToday(new Date(start.getTime() - 1))).not.toBe(day)
    }
  })
})
