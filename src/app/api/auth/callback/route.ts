import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Only allow same-origin relative paths ("/x" but not "//evil.com" or "https://...")
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

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
        logger.error('auth-api', 'User sync error', syncError)
      }

      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // In development, redirect to localhost
        return NextResponse.redirect(`${origin}${next}`)
      }

      // In production pin the redirect host to the configured app URL rather
      // than trusting the client-influenceable x-forwarded-host header.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      if (appUrl) {
        return NextResponse.redirect(`${appUrl.replace(/\/$/, '')}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If code exchange fails, redirect to an error page or login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
