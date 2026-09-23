const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True if `value` is a canonical UUID string (Postgres uuid columns reject anything else with a 500). */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Escape LIKE/ILIKE wildcards so user-supplied search text matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/**
 * Parse a `{ emailId }` / `{ emailIds }` request body into a validated,
 * de-duplicated list of UUIDs. Returns null if the shape is invalid.
 */
export function parseEmailIds(body: unknown, max = 500): string[] | null {
  if (!body || typeof body !== 'object') return null
  const { emailIds, emailId } = body as { emailIds?: unknown; emailId?: unknown }
  const raw: unknown[] = Array.isArray(emailIds) ? emailIds : emailId !== undefined ? [emailId] : []
  if (raw.length === 0 || raw.length > max) return null
  if (!raw.every(isUuid)) return null
  return Array.from(new Set(raw as string[]))
}
