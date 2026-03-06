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
 * Authenticate the current request. Returns the Supabase User.
 * Throws ApiError(401) if not authenticated.
 */
export async function requireAuth(): Promise<User> {
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
 * Authenticate + verify admin role. Returns the Supabase User.
 * Throws ApiError(401) if not authenticated, ApiError(403) if not admin.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
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
