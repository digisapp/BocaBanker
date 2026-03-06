import { NextResponse } from 'next/server'
import { requireAuth, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const user = await requireAuth()

    let [dbUser] = await db
      .select({ role: users.role, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    // Auto-create user row if missing (e.g. first login after Supabase Auth signup)
    if (!dbUser) {
      const [created] = await db
        .insert(users)
        .values({
          id: user.id,
          email: user.email!,
          fullName: user.user_metadata?.full_name || null,
          role: 'viewer',
        })
        .onConflictDoNothing()
        .returning({ role: users.role, fullName: users.fullName })
      dbUser = created ?? { role: 'viewer', fullName: null }
    }

    return NextResponse.json({
      role: dbUser.role || 'viewer',
      fullName: dbUser.fullName || null,
    })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('auth-api', 'Error fetching user role', error)
    return apiError('Internal Server Error')
  }
}
