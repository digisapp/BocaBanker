import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Throttle credential stuffing / brute force: per IP and per account
    const ip = getClientIp(request)
    const [ipLimit, emailLimit] = await Promise.all([
      rateLimit(`login:ip:${ip}`, { maxRequests: 20, windowMs: 15 * 60_000 }),
      rateLimit(`login:email:${email.trim().toLowerCase()}`, { maxRequests: 10, windowMs: 15 * 60_000 }),
    ])
    if (!ipLimit.success || !emailLimit.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return NextResponse.json({ user: data.user })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
