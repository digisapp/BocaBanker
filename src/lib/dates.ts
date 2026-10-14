/**
 * Calendar dates in the business's time zone.
 *
 * The server runs on UTC, so `new Date().getMonth()` / `toISOString()` roll
 * over to tomorrow at 8pm Eastern (7pm in winter): month-to-date figures
 * reset early on the last evening of a month, year-to-date on Dec 31, and a
 * loan funded at 9pm got tomorrow's date. "Today" for the business is the
 * date on a wall clock in Boca Raton.
 */
export const BUSINESS_TIME_ZONE = 'America/New_York'

const dateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function zonedParts(instant: Date) {
  const parts: Record<string, number> = {}
  for (const p of dateParts.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/** Today's date in the business time zone, as YYYY-MM-DD. */
export function businessToday(now: Date = new Date()): string {
  const { year, month, day } = zonedParts(now)
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

/** The current year in the business time zone. */
export function businessYear(now: Date = new Date()): number {
  return zonedParts(now).year
}

export interface BusinessPeriods {
  /** YYYY-MM-DD */
  today: string
  /** YYYY */
  year: string
  /** YYYY-MM */
  month: string
  /** YYYY-MM-01 */
  monthStart: string
  /** First day of next month (exclusive upper bound), YYYY-MM-01 */
  nextMonthStart: string
  /** YYYY-01-01 */
  yearStart: string
  /** Jan 1 of next year (exclusive upper bound) */
  nextYearStart: string
}

/**
 * The current month and year in the business time zone, as date strings for
 * comparing against `date` columns (YYYY-MM-DD sorts lexically):
 * `d >= monthStart && d < nextMonthStart`.
 */
export function businessPeriods(now: Date = new Date()): BusinessPeriods {
  const today = businessToday(now)
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7))
  const year = pad(y, 4)
  const month = `${year}-${pad(m)}`
  const nextMonth = m === 12 ? `${pad(y + 1, 4)}-01` : `${year}-${pad(m + 1)}`
  return {
    today,
    year,
    month,
    monthStart: `${month}-01`,
    nextMonthStart: `${nextMonth}-01`,
    yearStart: `${year}-01-01`,
    nextYearStart: `${pad(y + 1, 4)}-01-01`,
  }
}

/** True when the YYYY-MM-DD `date` falls in [start, end). */
export function isDateInRange(date: string | null | undefined, start: string, end: string): boolean {
  return !!date && date >= start && date < end
}

/**
 * The instant midnight begins on `date` (YYYY-MM-DD) in the business time
 * zone — for comparing timestamp columns against a business-calendar
 * boundary (e.g. "created this month"). US DST switches at 2am, so local
 * midnight always exists exactly once.
 */
export function startOfBusinessDay(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const wallClockAsUtc = Date.UTC(y, m - 1, d)
  // UTC offset (zoned wall clock minus UTC) at an instant
  const offsetAt = (ms: number) => {
    const p = zonedParts(new Date(ms))
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms
  }
  // First guess uses the offset at UTC midnight, which can sit on the other
  // side of a DST switch; the offset at the guess itself is the right one.
  const guess = wallClockAsUtc - offsetAt(wallClockAsUtc)
  return new Date(wallClockAsUtc - offsetAt(guess))
}
