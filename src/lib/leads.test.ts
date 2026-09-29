import { describe, it, expect } from 'vitest'
import { formatPhone, leadTitle, realValue } from './leads'

describe('realValue', () => {
  it('treats agent placeholders and blanks as missing', () => {
    expect(realValue('Not provided')).toBeNull()
    expect(realValue('Unknown yet')).toBeNull()
    expect(realValue('  ')).toBeNull()
    expect(realValue(null)).toBeNull()
  })

  it('keeps real values, trimmed', () => {
    expect(realValue(' 123 Main St ')).toBe('123 Main St')
  })
})

describe('formatPhone', () => {
  it('formats US numbers with or without the country code', () => {
    expect(formatPhone('+15615737510')).toBe('(561) 573-7510')
    expect(formatPhone('561-573-7510')).toBe('(561) 573-7510')
  })

  it('leaves other numbers alone', () => {
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958')
  })
})

describe('leadTitle', () => {
  const blank = { propertyAddress: 'Not provided', buyerName: 'Unknown yet' }

  it('prefers the property address', () => {
    expect(leadTitle({ propertyAddress: '1 Ocean Blvd', buyerName: 'Ann Lee' })).toBe('1 Ocean Blvd')
  })

  it('falls back to the buyer, then a formatted phone, then email', () => {
    expect(leadTitle({ ...blank, buyerName: 'Ann Lee' })).toBe('Ann Lee')
    expect(leadTitle({ ...blank, buyerPhone: '+15615737510' })).toBe('(561) 573-7510')
    expect(leadTitle({ ...blank, buyerEmail: 'ann@example.com' })).toBe('ann@example.com')
    expect(leadTitle(blank)).toBe('Untitled Lead')
  })
})
