import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { deleteDocument } from '@/lib/ai/xai-collections'

// DELETE /api/admin/collections/[id]/documents/[docId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id: collectionId, docId } = await params
    await requireAdmin()

    await deleteDocument(collectionId, docId)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('admin-collections', 'Failed to delete document', error)
    return apiError('Failed to delete document')
  }
}
