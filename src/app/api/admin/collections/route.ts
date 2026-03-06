import { NextResponse } from 'next/server'
import { requireAdmin, ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { listCollections, createCollection } from '@/lib/ai/xai-collections'

// GET /api/admin/collections
export async function GET() {
  try {
    await requireAdmin()

    const collections = await listCollections()
    return NextResponse.json({ collections })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('admin-collections', 'Failed to list collections', error)
    return apiError('Failed to list collections')
  }
}

// POST /api/admin/collections — { name: string, description?: string }
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const { name, description } = await request.json()
    if (!name || typeof name !== 'string') {
      return apiError('name is required', 400)
    }

    const collection = await createCollection(name, description)
    return NextResponse.json({ collection }, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('admin-collections', 'Failed to create collection', error)
    return apiError('Failed to create collection')
  }
}
