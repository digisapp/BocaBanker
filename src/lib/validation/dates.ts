import { z } from 'zod'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * True for a real calendar date written as YYYY-MM-DD.
 *
 * `Date.parse('2026-02-30')` succeeds (it rolls over to Mar 2) but Postgres
 * rejects '2026-02-30'::date, which surfaced as a 500. Build the date from
 * its parts and require the parts to survive the round trip.
 */
export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** A required YYYY-MM-DD calendar date. */
export const isoDateString = z
  .string()
  .trim()
  .regex(ISO_DATE, 'Must be YYYY-MM-DD')
  .refine(isIsoDate, 'Invalid date')

/**
 * Optional date for create schemas: a real YYYY-MM-DD date, '' or omitted.
 * Routes already map '' to null (`data.x || null`).
 */
export const optionalIsoDate = isoDateString.optional().or(z.literal(''))
