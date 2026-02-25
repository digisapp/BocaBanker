import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [dbUser] = await db
      .select({ role: users.role, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    return NextResponse.json({
      role: dbUser?.role || 'viewer',
      fullName: dbUser?.fullName || null,
    })
  } catch (error) {
    logger.error('auth-api', 'Error fetching user role', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
