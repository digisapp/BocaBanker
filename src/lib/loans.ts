/**
 * Loans that have closed and pay commission. Commission MTD/YTD (dashboard
 * stats and the commission page) count exactly these, by actual closing
 * date; the active pipeline excludes them (and withdrawn).
 */
export const CLOSED_LOAN_STATUSES = ['funded', 'closed'] as const

export function isClosedLoanStatus(status: string | null | undefined): boolean {
  return (CLOSED_LOAN_STATUSES as readonly string[]).includes(status ?? '')
}

/**
 * The actual closing date to record when a loan is saved, or null to leave
 * the column as the request has it.
 *
 * Commission MTD/YTD only counts loans with an actual closing date, and
 * nothing set it when a loan was marked funded/closed, so those loans never
 * showed up. When a loan *moves into* funded/closed with no date on file and
 * none in the request, stamp `today`. Never overwrites a date, and re-saving
 * an already funded/closed loan doesn't stamp one (an older loan edited
 * today would otherwise land in this month's commission).
 */
export function autoClosingDate(opts: {
  /** Status before this save; null for a new loan. */
  previousStatus: string | null
  /** Status after this save. */
  nextStatus: string | null | undefined
  /** actual_closing_date on file; null for a new loan. */
  existingDate: string | null
  /** actual_closing_date in the request ('' / null / undefined = none). */
  requestedDate: string | null | undefined
  /** YYYY-MM-DD in the business time zone. */
  today: string
}): string | null {
  const { previousStatus, nextStatus, existingDate, requestedDate, today } = opts
  if (!isClosedLoanStatus(nextStatus)) return null
  if (nextStatus === previousStatus) return null
  if (existingDate || requestedDate) return null
  return today
}
