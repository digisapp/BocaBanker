import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sync user to users table if they don't exist yet (needed for magic link signups)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const existing = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
          if (existing.length === 0) {
            await db.insert(users).values({
              id: user.id,
              email: user.email!,
              fullName: user.user_metadata?.full_name || null,
            })
          }
        }
      } catch (syncError) {
        // Don't block the redirect if sync fails — user can still use the app
        console.error('User sync error:', syncError)
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // In development, redirect to localhost
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // In production behind a proxy/load balancer
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // If code exchange fails, redirect to an error page or login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
