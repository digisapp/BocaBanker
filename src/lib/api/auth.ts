import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { User } from '@supabase/supabase-js'

/**
 * Custom error that carries an HTTP response.
 * Caught by the existing try/catch in every route handler.
 */
export class ApiError extends Error {
  public readonly response: Response

  constructor(message: string, status: number) {
    super(message)
    this.response = Response.json({ error: message }, { status })
  }
}

/**
 * Require a signed-in Supabase session, with no role check. Only
 * /api/auth/me should use this: it reports the role so the UI can react.
 * Throws ApiError(401) if not authenticated.
 */
export async function requireSession(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new ApiError('Unauthorized', 401)
  }
  return user
}

/**
 * Authenticate the owner. Returns the Supabase User.
 *
 * Boca Banker is a single-user platform, so a session alone is not enough:
 * anyone who can sign up through Supabase Auth would have one. The account
 * must also hold the admin role in `users`.
 * Throws ApiError(401) if not authenticated, ApiError(403) if not admin.
 */
export async function requireAuth(): Promise<User> {
  const user = await requireSession()
  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!dbUser || dbUser.role !== 'admin') {
    throw new ApiError('Forbidden', 403)
  }
  return user
}

/** Same check as requireAuth; kept for routes that read as admin-only. */
export const requireAdmin = requireAuth
