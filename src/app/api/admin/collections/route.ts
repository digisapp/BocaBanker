import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { listCollections, createCollection } from '@/lib/ai/xai-collections'

// GET /api/admin/collections
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const collections = await listCollections()
    return NextResponse.json({ collections })
  } catch (error) {
    logger.error('admin-collections', 'Failed to list collections', error)
    return NextResponse.json({ error: 'Failed to list collections' }, { status: 500 })
  }
}

// POST /api/admin/collections — { name: string, description?: string }
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description } = await request.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const collection = await createCollection(name, description)
    return NextResponse.json({ collection }, { status: 201 })
  } catch (error) {
    logger.error('admin-collections', 'Failed to create collection', error)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
