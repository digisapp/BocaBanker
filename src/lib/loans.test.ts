import { describe, it, expect } from 'vitest'
import { autoClosingDate, isClosedLoanStatus } from './loans'

const today = '2026-10-11'

describe('isClosedLoanStatus', () => {
  it('is true for funded and closed only', () => {
    expect(isClosedLoanStatus('funded')).toBe(true)
    expect(isClosedLoanStatus('closed')).toBe(true)
    expect(isClosedLoanStatus('clear_to_close')).toBe(false)
    expect(isClosedLoanStatus('withdrawn')).toBe(false)
    expect(isClosedLoanStatus(null)).toBe(false)
  })
})

describe('autoClosingDate', () => {
  const base = { previousStatus: 'clear_to_close', existingDate: null, requestedDate: null, today }

  it('stamps today when a loan moves into funded or closed', () => {
    expect(autoClosingDate({ ...base, nextStatus: 'funded' })).toBe(today)
    expect(autoClosingDate({ ...base, nextStatus: 'closed' })).toBe(today)
    expect(autoClosingDate({ ...base, previousStatus: 'funded', nextStatus: 'closed' })).toBe(today)
    expect(autoClosingDate({ ...base, requestedDate: '', nextStatus: 'funded' })).toBe(today)
    expect(autoClosingDate({ ...base, requestedDate: undefined, nextStatus: 'funded' })).toBe(today)
  })

  it('stamps a new loan created as funded/closed', () => {
    expect(autoClosingDate({ ...base, previousStatus: null, nextStatus: 'funded' })).toBe(today)
    expect(autoClosingDate({ ...base, previousStatus: null, nextStatus: 'pre_qual' })).toBeNull()
  })

  it('never overwrites a date on file or in the request', () => {
    expect(autoClosingDate({ ...base, existingDate: '2026-09-30', nextStatus: 'funded' })).toBeNull()
    expect(autoClosingDate({ ...base, requestedDate: '2026-10-02', nextStatus: 'funded' })).toBeNull()
  })

  it('leaves other statuses and unchanged statuses alone', () => {
    expect(autoClosingDate({ ...base, nextStatus: 'underwriting' })).toBeNull()
    expect(autoClosingDate({ ...base, nextStatus: 'withdrawn' })).toBeNull()
    expect(autoClosingDate({ ...base, nextStatus: undefined })).toBeNull()
    // An older funded loan with no date, edited today, isn't put in this month
    expect(autoClosingDate({ ...base, previousStatus: 'funded', nextStatus: 'funded' })).toBeNull()
  })
})
