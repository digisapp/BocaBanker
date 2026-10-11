import { describe, it, expect } from 'vitest'
import { formatPhone, leadStatusChangeError, leadTitle, newLeadStatusError, realValue } from './leads'

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

describe('leadStatusChangeError', () => {
  const open = { status: 'qualified', convertedClientId: null }
  const converted = { status: 'converted', convertedClientId: '3f2b7c1e-8a4d-4f6b-9c2e-1a2b3c4d5e6f' }

  it('allows ordinary status changes', () => {
    expect(leadStatusChangeError(open, 'contacted')).toBeNull()
    expect(leadStatusChangeError(open, 'lost')).toBeNull()
  })

  it('only lets Convert set "converted" (a manual flip creates no client)', () => {
    expect(leadStatusChangeError(open, 'converted')).toMatch(/Convert to Client/)
  })

  it('allows re-saving the current status (the edit form always sends it)', () => {
    expect(leadStatusChangeError(converted, 'converted')).toBeNull()
    expect(leadStatusChangeError(open, 'qualified')).toBeNull()
  })

  it('keeps a lead with a client in "converted" so Convert cannot run twice', () => {
    expect(leadStatusChangeError(converted, 'qualified')).toMatch(/already been converted/)
  })

  it('lets a lead that already has a client return to "converted"', () => {
    expect(leadStatusChangeError({ ...converted, status: 'qualified' }, 'converted')).toBeNull()
  })

  it('lets a "converted" lead with no client (manual flip / deleted client) reopen', () => {
    expect(leadStatusChangeError({ status: 'converted', convertedClientId: null }, 'qualified')).toBeNull()
  })
})

describe('newLeadStatusError', () => {
  it('rejects creating a lead as "converted" (it would have no client)', () => {
    expect(newLeadStatusError('converted')).toMatch(/Convert to Client/)
  })

  it('allows every other status', () => {
    for (const status of ['new', 'contacted', 'qualified', 'proposal_sent', 'lost', undefined, null]) {
      expect(newLeadStatusError(status)).toBeNull()
    }
  })
})
