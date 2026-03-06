import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { listDocuments, uploadDocument } from '@/lib/ai/xai-collections'

// GET /api/admin/collections/[id]/documents
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: collectionId } = await params
    await requireAdmin()

    const documents = await listDocuments(collectionId)
    return NextResponse.json({ documents })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('admin-collections', 'Failed to list documents', error)
    return apiError('Failed to list documents')
  }
}

// POST /api/admin/collections/[id]/documents — { content: string, title?: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: collectionId } = await params
    await requireAdmin()

    const { content, title } = await request.json()
    if (!content || typeof content !== 'string') {
      return apiError('content is required', 400)
    }

    const document = await uploadDocument(collectionId, content, title)
    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('admin-collections', 'Failed to upload document', error)
    return apiError('Failed to upload document')
  }
}
