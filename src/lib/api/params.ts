import { ApiError } from './auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Validate a route `[id]` segment. A malformed id can never match a row, so
 * respond 404 instead of letting Postgres raise 22P02 (surfaced as a 500).
 */
export function requireUuid(value: unknown, notFoundMessage = 'Not found'): string {
  if (!isUuid(value)) {
    throw new ApiError(notFoundMessage, 404)
  }
  return value
}

/**
 * Parse page/limit query params. Non-numeric input falls back to defaults
 * (Number('abc') is NaN, which previously flowed into OFFSET and 500'd).
 */
export function parsePagination(
  searchParams: URLSearchParams,
  { defaultLimit = 10, maxLimit = 100 }: { defaultLimit?: number; maxLimit?: number } = {},
): { page: number; limit: number; offset: number } {
  const rawPage = Math.floor(Number(searchParams.get('page') ?? '1'))
  const rawLimit = Math.floor(Number(searchParams.get('limit') ?? String(defaultLimit)))
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 100_000) : 1
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit
  return { page, limit, offset: (page - 1) * limit }
}

/** Escape LIKE/ILIKE wildcards so user search text is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}
