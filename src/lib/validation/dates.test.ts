import { describe, it, expect, vi, afterEach } from 'vitest'
import { z } from 'zod'
import { isIsoDate, optionalIsoDate } from './dates'
import { firstIssueMessage } from './errors'
import { leadSchema, loanSchema, propertySchema } from './schemas'

describe('isIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isIsoDate('2026-01-31')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true) // leap year
    expect(isIsoDate('2000-02-29')).toBe(true) // divisible by 400
  })

  it('rejects dates that Date.parse silently rolls over', () => {
    expect(Number.isNaN(Date.parse('2026-02-30'))).toBe(false) // the original bug
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-02-29')).toBe(false) // not a leap year
    expect(isIsoDate('1900-02-29')).toBe(false) // century, not leap
    expect(isIsoDate('2026-04-31')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2026-00-10')).toBe(false)
    expect(isIsoDate('2026-01-00')).toBe(false)
  })

  it('requires the strict YYYY-MM-DD shape', () => {
    expect(isIsoDate('garbage')).toBe(false)
    expect(isIsoDate('2026-1-5')).toBe(false)
    expect(isIsoDate('01/05/2026')).toBe(false)
    expect(isIsoDate('2026-01-05T00:00:00Z')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})

describe('optionalIsoDate', () => {
  const schema = z.object({ d: optionalIsoDate })

  it('allows a real date, empty string, or omission', () => {
    expect(schema.safeParse({ d: '2026-03-01' }).success).toBe(true)
    expect(schema.safeParse({ d: '' }).success).toBe(true)
    expect(schema.safeParse({}).success).toBe(true)
  })

  it('rejects garbage and impossible dates with a field message', () => {
    const bad = schema.safeParse({ d: '2026-02-30' })
    expect(bad.success).toBe(false)
    if (!bad.success) expect(firstIssueMessage(bad.error)).toBe('d: Invalid date')
    const garbage = schema.safeParse({ d: 'garbage' })
    expect(garbage.success).toBe(false)
    if (!garbage.success) expect(firstIssueMessage(garbage.error)).toBe('d: Must be YYYY-MM-DD')
  })
})

describe('create schemas validate dates', () => {
  it('leadSchema.sale_date', () => {
    const base = { property_address: '1 Main St', property_type: 'office' }
    expect(leadSchema.safeParse({ ...base, sale_date: '2026-02-28' }).success).toBe(true)
    expect(leadSchema.safeParse({ ...base, sale_date: '' }).success).toBe(true)
    expect(leadSchema.safeParse({ ...base, sale_date: '2026-02-30' }).success).toBe(false)
    expect(leadSchema.safeParse({ ...base, sale_date: 'garbage' }).success).toBe(false)
  })

  it('loanSchema closing dates', () => {
    const base = { borrower_name: 'Jane', property_address: '1 Main St', loan_amount: 1, loan_type: 'fha' }
    expect(loanSchema.safeParse({ ...base, estimated_closing_date: '2026-11-30' }).success).toBe(true)
    expect(loanSchema.safeParse({ ...base, estimated_closing_date: '2026-11-31' }).success).toBe(false)
    expect(loanSchema.safeParse({ ...base, actual_closing_date: 'soon' }).success).toBe(false)
  })

  it('propertySchema purchase / origination dates', () => {
    const base = {
      address: '1 Main St',
      city: 'Boca Raton',
      state: 'FL',
      zip: '33432',
      property_type: 'office',
      purchase_price: 1,
    }
    expect(propertySchema.safeParse({ ...base, purchase_date: '2025-06-15' }).success).toBe(true)
    expect(propertySchema.safeParse({ ...base, purchase_date: '2025-06-31' }).success).toBe(false)
    expect(propertySchema.safeParse({ ...base, loan_origination_date: 'x' }).success).toBe(false)
  })
})

describe('loanSchema.arive_link', () => {
  const base = { borrower_name: 'Jane', property_address: '1 Main St', loan_amount: 1, loan_type: 'fha' }

  it('accepts http(s) links and empty', () => {
    expect(loanSchema.safeParse({ ...base, arive_link: 'https://app.arive.com/x' }).success).toBe(true)
    expect(loanSchema.safeParse({ ...base, arive_link: '' }).success).toBe(true)
  })

  it('rejects script and data URLs (the link is emailed to the borrower)', () => {
    expect(loanSchema.safeParse({ ...base, arive_link: 'javascript:alert(1)' }).success).toBe(false)
    expect(loanSchema.safeParse({ ...base, arive_link: 'data:text/html,hi' }).success).toBe(false)
  })
})

describe('year_built upper bound', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the current Eastern year at validation time, not at module load', () => {
    const lead = { property_address: '1 Main St', property_type: 'office' }
    const property = { address: '1 Main St', city: 'Boca Raton', state: 'FL', zip: '33432', property_type: 'office', purchase_price: 1 }
    vi.useFakeTimers({ toFake: ['Date'] })
    // 8pm Eastern on Dec 31, 2026 (already 2027 in UTC)
    vi.setSystemTime(new Date('2027-01-01T01:00:00Z'))
    expect(leadSchema.safeParse({ ...lead, year_built: 2026 }).success).toBe(true)
    expect(leadSchema.safeParse({ ...lead, year_built: 2027 }).success).toBe(false)
    expect(propertySchema.safeParse({ ...property, year_built: 2027 }).success).toBe(false)
    // New Year's Day in Boca
    vi.setSystemTime(new Date('2027-01-01T06:00:00Z'))
    expect(leadSchema.safeParse({ ...lead, year_built: 2027 }).success).toBe(true)
    expect(propertySchema.safeParse({ ...property, year_built: 2027 }).success).toBe(true)
  })
})
