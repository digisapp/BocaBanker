import { db } from '@/db'
import { clients, costSegStudies } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { isUuid } from './params'

/**
 * Foreign-key ids that arrive in a request body (client_id, study_id, ...)
 * must be checked against the caller — a bare FK accepts any existing row,
 * and joins on it would then expose another user's data.
 *
 * Each resolver returns the id when it belongs to the caller, null when the
 * input is absent/empty, or false when it is malformed or not owned.
 */
export async function resolveOwnedClientId(raw: unknown, userId: string): Promise<string | null | false> {
  if (raw === undefined || raw === null || raw === '') return null
  if (!isUuid(raw)) return false
  const [row] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, raw), eq(clients.userId, userId)))
    .limit(1)
  return row ? row.id : false
}

export async function resolveOwnedStudyId(raw: unknown, userId: string): Promise<string | null | false> {
  if (raw === undefined || raw === null || raw === '') return null
  if (!isUuid(raw)) return false
  const [row] = await db
    .select({ id: costSegStudies.id })
    .from(costSegStudies)
    .where(and(eq(costSegStudies.id, raw), eq(costSegStudies.userId, userId)))
    .limit(1)
  return row ? row.id : false
}
