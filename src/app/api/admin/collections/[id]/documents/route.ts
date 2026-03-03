import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { listDocuments, uploadDocument } from '@/lib/ai/xai-collections'

// GET /api/admin/collections/[id]/documents
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const documents = await listDocuments(collectionId)
    return NextResponse.json({ documents })
  } catch (error) {
    logger.error('admin-collections', 'Failed to list documents', error)
    return NextResponse.json({ error: 'Failed to list documents' }, { status: 500 })
  }
}

// POST /api/admin/collections/[id]/documents — { content: string, title?: string, metadata?: object }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { content, title, metadata } = await request.json()
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const document = await uploadDocument(collectionId, content, title, metadata)
    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    logger.error('admin-collections', 'Failed to upload document', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
