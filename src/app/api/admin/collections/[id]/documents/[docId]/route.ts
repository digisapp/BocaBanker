import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { deleteDocument } from '@/lib/ai/xai-collections'

// DELETE /api/admin/collections/[id]/documents/[docId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id: collectionId, docId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [dbUser] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteDocument(collectionId, docId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('admin-collections', 'Failed to delete document', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
