import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

let _cache: { id: string | null; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000;

/**
 * Returns the id of the default owner for unattributed records
 * (inbound emails from unknown senders, guest-captured leads).
 *
 * Picks the earliest-created admin user for determinism. Returns null
 * only if no admin user exists.
 */
export async function getDefaultOwnerId(): Promise<string | null> {
  const now = Date.now();
  if (_cache && now < _cache.expiresAt && _cache.id !== null) {
    return _cache.id;
  }

  try {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(asc(users.createdAt))
      .limit(1);

    const id = admin?.id ?? null;
    _cache = { id, expiresAt: now + CACHE_TTL_MS };
    return id;
  } catch (err) {
    logger.error('default-owner', 'Failed to look up default admin owner', err);
    return null;
  }
}
