import { describe, it, expect } from 'vitest'
import { leadUpdateSchema, loanUpdateSchema, studyUpdateSchema } from './update-schemas'
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
