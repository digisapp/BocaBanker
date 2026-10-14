import { describe, it, expect } from 'vitest'
import { leadUpdateSchema, loanUpdateSchema, propertyUpdateSchema, studyUpdateSchema } from './update-schemas'
import { firstIssueMessage } from './errors'
import { parsePagination, isUuid, escapeLike } from '@/lib/api/params'

describe('leadUpdateSchema', () => {
  it('accepts a status-only partial update', () => {
    const r = leadUpdateSchema.safeParse({ status: 'contacted' })
    expect(r.success).toBe(true)
    if (r.success) expect(Object.keys(r.data)).toEqual(['status'])
  })

  it('rejects an unknown status', () => {
    expect(leadUpdateSchema.safeParse({ status: 'bogus' }).success).toBe(false)
  })

  it('coerces numeric strings and splits tag strings', () => {
    const r = leadUpdateSchema.safeParse({ sale_price: '1200000.50', tags: 'a, b,,c' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.sale_price).toBe('1200000.5')
      expect(r.data.tags).toEqual(['a', 'b', 'c'])
    }
  })

  it('rejects a non-numeric sale price', () => {
    expect(leadUpdateSchema.safeParse({ sale_price: 'abc' }).success).toBe(false)
  })

  it('allows null to clear optional fields', () => {
    const r = leadUpdateSchema.safeParse({ buyer_email: null, notes: null, sale_date: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.sale_date).toBeNull()
  })

  it('rejects impossible dates instead of letting Postgres 500', () => {
    expect(leadUpdateSchema.safeParse({ sale_date: '2026-02-30' }).success).toBe(false)
    expect(leadUpdateSchema.safeParse({ sale_date: '2026-02-28' }).success).toBe(true)
  })
})

describe('propertyUpdateSchema', () => {
  // What the edit page sends for a property created by lead conversion:
  // no city/state/ZIP and the NOT NULL purchase price stored as 0.
  const converted = {
    address: '1 Ocean Blvd',
    city: '',
    state: '',
    zip: '',
    property_type: 'other',
    purchase_price: 0,
  }

  it('saves a converted property (blank location, $0 price)', () => {
    const r = propertyUpdateSchema.safeParse(converted)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.city).toBeNull()
      expect(r.data.state).toBeNull()
      expect(r.data.zip).toBeNull()
      expect(r.data.purchase_price).toBe('0')
    }
  })

  it('accepts null location fields and numeric strings', () => {
    const r = propertyUpdateSchema.safeParse({
      ...converted,
      city: null,
      zip: null,
      state: 'fl',
      purchase_price: '425000.00',
      building_value: 0,
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.state).toBe('FL')
      expect(r.data.purchase_price).toBe('425000')
      expect(r.data.building_value).toBe('0')
    }
  })

  it('still validates non-empty values, naming the field', () => {
    const zip = propertyUpdateSchema.safeParse({ ...converted, zip: '12' })
    expect(zip.success).toBe(false)
    if (!zip.success) expect(firstIssueMessage(zip.error)).toBe('zip: Please enter a valid ZIP code')

    const state = propertyUpdateSchema.safeParse({ ...converted, state: 'Florida' })
    expect(state.success).toBe(false)
    if (!state.success) expect(firstIssueMessage(state.error)).toBe('state: Use 2-letter state abbreviation')

    const price = propertyUpdateSchema.safeParse({ ...converted, purchase_price: undefined })
    expect(price.success).toBe(false)
    if (!price.success) expect(firstIssueMessage(price.error)).toBe('purchase_price: Purchase price is required')

    expect(propertyUpdateSchema.safeParse({ ...converted, purchase_price: -1 }).success).toBe(false)
    expect(propertyUpdateSchema.safeParse({ ...converted, purchase_date: '2026-02-30' }).success).toBe(false)
  })
})

describe('loanUpdateSchema', () => {
  it('accepts the loan detail page payload shape', () => {
    const r = loanUpdateSchema.safeParse({
      borrower_name: 'Jane',
      property_address: '1 Main St',
      loan_amount: '350000.00',
      loan_type: 'fha',
      purchase_price: null,
      status: 'processing',
      interest_rate: '6.5',
      term: 30,
      commission_bps: null,
      ariveLink: undefined,
      estimated_closing_date: null,
    })
    expect(r.success).toBe(true)
  })

  it('rejects out-of-range commission bps and non-http arive links', () => {
    expect(loanUpdateSchema.safeParse({ commission_bps: 9000 }).success).toBe(false)
    expect(loanUpdateSchema.safeParse({ arive_link: 'javascript:alert(1)' }).success).toBe(false)
  })
})

describe('studyUpdateSchema', () => {
  it('rejects null tax_rate (previously crashed with .toString on null)', () => {
    expect(studyUpdateSchema.safeParse({ tax_rate: null }).success).toBe(false)
  })
})

describe('params helpers', () => {
  it('falls back to defaults on non-numeric pagination', () => {
    const p = parsePagination(new URLSearchParams('page=abc&limit=xyz'), { defaultLimit: 12 })
    expect(p).toEqual({ page: 1, limit: 12, offset: 0 })
  })

  it('caps limit', () => {
    expect(parsePagination(new URLSearchParams('limit=100000')).limit).toBe(100)
  })

  it('validates uuids', () => {
    expect(isUuid('3f2b7c1e-8a4d-4f6b-9c2e-1a2b3c4d5e6f')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
  })

  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\')
  })
})
