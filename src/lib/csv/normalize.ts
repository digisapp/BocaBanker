import { isIsoDate } from '@/lib/validation/dates'

/**
 * Cell normalizers for CSV imports. Each returns null for an empty cell and
 * undefined when the cell has a value that can't be read — callers decide
 * whether that skips the row or just drops the field.
 */

const SUFFIX: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 }

/**
 * Non-negative amount: "$1,200,000" -> "1200000", "1.5M" -> "1500000",
 * "350K" -> "350000". The whole cell must be a number — parseFloat used to
 * read a prefix ("$1.5M" -> 1.5, "12abc" -> 12).
 */
export function normalizeNumeric(raw: string): string | null | undefined {
  const cleaned = raw.trim().replace(/[$,\s]/g, '')
  if (!cleaned) return null
  const m = /^(\d+(?:\.\d+)?|\.\d+)([kmb])?$/i.exec(cleaned)
  if (!m) return undefined
  const base = Number(m[1])
  const value = m[2] ? Number((base * SUFFIX[m[2].toLowerCase()]).toFixed(2)) : base
  return Number.isFinite(value) ? value.toString() : undefined
}

/**
 * Whole number within [min, max]: "12,500" -> 12500, "12500.0" -> 12500.
 * Bounds keep values inside the int4 column (an out-of-range value used to
 * fail the whole insert batch).
 */
export function normalizeInteger(
  raw: string,
  { min, max }: { min: number; max: number },
): number | null | undefined {
  const cleaned = raw.trim().replace(/[,\s]/g, '')
  if (!cleaned) return null
  if (!/^\d+(\.0+)?$/.test(cleaned)) return undefined
  const value = Number(cleaned)
  return value >= min && value <= max ? value : undefined
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

function monthNumber(name: string): number | null {
  const n = name.toLowerCase().replace(/\.$/, '')
  if (n.length < 3) return null
  const i = MONTHS.findIndex((full) => full.startsWith(n))
  return i === -1 ? null : i + 1
}

/** Two-digit years pivot like Excel: 00-29 -> 2000s, 30-99 -> 1900s. */
function fullYear(y: string): number {
  const n = Number(y)
  if (y.length > 2) return n
  return n < 30 ? 2000 + n : 1900 + n
}

function iso(year: number, month: number, day: number): string | undefined {
  const s = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return isIsoDate(s) ? s : undefined
}

/**
 * Calendar date -> YYYY-MM-DD. Accepts YYYY-MM-DD (optionally followed by a
 * time), YYYY/MM/DD, MM/DD/YYYY, M/D/YY, MM-DD-YYYY, "Mar 3, 2026" and
 * "3 Mar 2026". Impossible dates (Feb 30) are rejected instead of rolling
 * over, so they can't reach Postgres and fail the insert batch.
 */
export function normalizeDate(raw: string): string | null | undefined {
  const s = raw.trim()
  if (!s) return null

  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/.exec(s)
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(s)
  if (m) return iso(fullYear(m[3]), Number(m[1]), Number(m[2]))

  m = /^([a-z]+\.?)\s+(\d{1,2}),?\s+(\d{4})$/i.exec(s)
  if (m) {
    const month = monthNumber(m[1])
    return month ? iso(Number(m[3]), month, Number(m[2])) : undefined
  }

  m = /^(\d{1,2})[\s-]([a-z]+\.?)[\s-],?\s*(\d{4})$/i.exec(s)
  if (m) {
    const month = monthNumber(m[2])
    return month ? iso(Number(m[3]), month, Number(m[1])) : undefined
  }

  return undefined
}
