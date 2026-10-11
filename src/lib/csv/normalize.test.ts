import { describe, it, expect } from 'vitest'
import { normalizeDate, normalizeInteger, normalizeNumeric } from './normalize'

describe('normalizeNumeric', () => {
  it('reads currency formatting', () => {
    expect(normalizeNumeric('$1,200,000')).toBe('1200000')
    expect(normalizeNumeric(' 350000.50 ')).toBe('350000.5')
    expect(normalizeNumeric('$ 0')).toBe('0')
  })

  it('expands K/M/B suffixes', () => {
    expect(normalizeNumeric('$1.5M')).toBe('1500000')
    expect(normalizeNumeric('350K')).toBe('350000')
    expect(normalizeNumeric('1.15m')).toBe('1150000')
    expect(normalizeNumeric('2B')).toBe('2000000000')
  })

  it('returns null for empty cells', () => {
    expect(normalizeNumeric('')).toBeNull()
    expect(normalizeNumeric('   ')).toBeNull()
  })

  it('rejects anything not fully numeric (parseFloat read a prefix)', () => {
    expect(normalizeNumeric('12abc')).toBeUndefined()
    expect(normalizeNumeric('N/A')).toBeUndefined()
    expect(normalizeNumeric('1.2.3')).toBeUndefined()
    expect(normalizeNumeric('-500')).toBeUndefined()
    expect(normalizeNumeric('1e6')).toBeUndefined()
    expect(normalizeNumeric('5MM')).toBeUndefined()
  })
})

describe('normalizeInteger', () => {
  const sqft = { min: 1, max: 2_000_000_000 }

  it('reads whole numbers with separators', () => {
    expect(normalizeInteger('12,500', sqft)).toBe(12500)
    expect(normalizeInteger('12500.0', sqft)).toBe(12500)
    expect(normalizeInteger('', sqft)).toBeNull()
  })

  it('rejects partial numbers, fractions and out-of-range values', () => {
    expect(normalizeInteger('12abc', sqft)).toBeUndefined()
    expect(normalizeInteger('1250.5', sqft)).toBeUndefined()
    expect(normalizeInteger('0', sqft)).toBeUndefined()
    expect(normalizeInteger('3000000000', sqft)).toBeUndefined() // > int4
    expect(normalizeInteger('1850', { min: 1000, max: 2100 })).toBe(1850)
    expect(normalizeInteger('19855', { min: 1000, max: 2100 })).toBeUndefined()
  })
})

describe('normalizeDate', () => {
  it('accepts ISO dates, with or without a time', () => {
    expect(normalizeDate('2026-03-05')).toBe('2026-03-05')
    expect(normalizeDate('2026-3-5')).toBe('2026-03-05')
    expect(normalizeDate('2026/03/05')).toBe('2026-03-05')
    expect(normalizeDate('2026-03-05T23:30:00-05:00')).toBe('2026-03-05')
  })

  it('accepts US slash/dash dates with an Excel-style two-digit year pivot', () => {
    expect(normalizeDate('03/05/2026')).toBe('2026-03-05')
    expect(normalizeDate('3/5/26')).toBe('2026-03-05')
    expect(normalizeDate('3/5/98')).toBe('1998-03-05')
    expect(normalizeDate('03-05-2026')).toBe('2026-03-05')
  })

  it('accepts month names', () => {
    expect(normalizeDate('Mar 5, 2026')).toBe('2026-03-05')
    expect(normalizeDate('March 5 2026')).toBe('2026-03-05')
    expect(normalizeDate('Sept. 5, 2026')).toBe('2026-09-05')
    expect(normalizeDate('5 Mar 2026')).toBe('2026-03-05')
    expect(normalizeDate('05-Mar-2026')).toBe('2026-03-05')
  })

  it('rejects impossible dates instead of rolling them over', () => {
    expect(normalizeDate('2026-02-30')).toBeUndefined()
    expect(normalizeDate('02/30/2026')).toBeUndefined()
    expect(normalizeDate('Feb 30, 2026')).toBeUndefined()
    expect(normalizeDate('13/01/2026')).toBeUndefined()
  })

  it('returns null for empty and undefined for garbage', () => {
    expect(normalizeDate('  ')).toBeNull()
    expect(normalizeDate('garbage')).toBeUndefined()
    expect(normalizeDate('Smarch 5, 2026')).toBeUndefined()
  })
})
