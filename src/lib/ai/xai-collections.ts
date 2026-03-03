import { logger } from '@/lib/logger'

// ─── Types ───────────────────────────────────────────────────────────

export interface CollectionSearchResult {
  content: string
  score: number
  document_id?: string
  metadata?: Record<string, unknown>
}

export interface Collection {
  id: string
  name: string
  description?: string
  created_at?: string
}

// ─── Configuration ───────────────────────────────────────────────────

const SEARCH_API_BASE = 'https://api.x.ai/v1'
const MANAGEMENT_API_BASE = 'https://management-api.x.ai/v1'
const SEARCH_TIMEOUT_MS = 3000
const MAX_CONTEXT_CHARS = 4000
const MAX_RESULTS = 5

// ─── Feature flag ────────────────────────────────────────────────────

export function isRagEnabled(): boolean {
  return (
    process.env.ENABLE_RAG === 'true' &&
    !!process.env.XAI_API_KEY &&
    !!process.env.XAI_COLLECTION_ID
  )
}

// ─── Search ──────────────────────────────────────────────────────────

/**
 * Search the configured xAI collection for documents relevant to the query.
 * Returns an empty array on any failure (timeout, network, bad response).
 */
export async function searchCollection(
  query: string,
  collectionId?: string,
): Promise<CollectionSearchResult[]> {
  const targetCollection = collectionId || process.env.XAI_COLLECTION_ID
  const apiKey = process.env.XAI_API_KEY

  if (!targetCollection || !apiKey) return []

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${SEARCH_API_BASE}/documents/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        collection_id: targetCollection,
        retrieval_mode: 'hybrid',
        query,
        max_results: MAX_RESULTS,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      logger.warn('xai-collections', `Search returned ${response.status}`)
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logger.warn('xai-collections', 'Search timed out')
    } else {
      logger.error('xai-collections', 'Search failed', error)
    }
    return []
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Context formatting ─────────────────────────────────────────────

/**
 * Format search results into a context block for appending to the system prompt.
 */
export function formatRetrievedContext(results: CollectionSearchResult[]): string {
  if (!results.length) return ''

  let contextBlock = '\n\n## RETRIEVED KNOWLEDGE BASE CONTEXT\n'
  contextBlock +=
    'The following excerpts were retrieved from the knowledge base and may be relevant. ' +
    'Use them to provide more accurate and specific answers. ' +
    'If the excerpts are not relevant, ignore them and rely on your general knowledge.\n\n'

  let charCount = 0
  for (let i = 0; i < results.length; i++) {
    const snippet = results[i].content.trim()
    if (charCount + snippet.length > MAX_CONTEXT_CHARS) {
      const remaining = MAX_CONTEXT_CHARS - charCount
      if (remaining > 100) {
        contextBlock += `[Source ${i + 1}]:\n${snippet.slice(0, remaining)}...\n\n`
      }
      break
    }
    contextBlock += `[Source ${i + 1}]:\n${snippet}\n\n`
    charCount += snippet.length
  }

  return contextBlock
}

/**
 * Search + format in one call. Returns the augmented system prompt,
 * or the original prompt unchanged if RAG is disabled or search fails.
 */
export async function augmentPromptWithContext(
  basePrompt: string,
  userQuery: string,
): Promise<string> {
  if (!isRagEnabled()) return basePrompt

  const results = await searchCollection(userQuery)
  const context = formatRetrievedContext(results)

  return context ? basePrompt + context : basePrompt
}

// ─── Management API (admin only) ────────────────────────────────────

function getManagementHeaders(): Record<string, string> {
  const key = process.env.XAI_MANAGEMENT_API_KEY
  if (!key) throw new Error('XAI_MANAGEMENT_API_KEY is not configured')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }
}

export async function listCollections(): Promise<Collection[]> {
  const response = await fetch(`${MANAGEMENT_API_BASE}/collections`, {
    method: 'GET',
    headers: getManagementHeaders(),
  })
  if (!response.ok) throw new Error(`Failed to list collections: ${response.status}`)
  const data = await response.json()
  return data.collections || data
}

export async function createCollection(
  name: string,
  description?: string,
): Promise<Collection> {
  const response = await fetch(`${MANAGEMENT_API_BASE}/collections`, {
    method: 'POST',
    headers: getManagementHeaders(),
    body: JSON.stringify({ collection_name: name, description }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to create collection: ${response.status} ${body}`)
  }
  return response.json()
}

export async function uploadDocument(
  collectionId: string,
  content: string,
  title?: string,
  metadata?: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/collections/${collectionId}/documents`,
    {
      method: 'POST',
      headers: getManagementHeaders(),
      body: JSON.stringify({ content, title, metadata }),
    },
  )
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to upload document: ${response.status} ${body}`)
  }
  return response.json()
}

export async function listDocuments(collectionId: string): Promise<unknown[]> {
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/collections/${collectionId}/documents`,
    { method: 'GET', headers: getManagementHeaders() },
  )
  if (!response.ok) throw new Error(`Failed to list documents: ${response.status}`)
  const data = await response.json()
  return data.documents || data
}

export async function deleteDocument(
  collectionId: string,
  documentId: string,
): Promise<void> {
  const response = await fetch(
    `${MANAGEMENT_API_BASE}/collections/${collectionId}/documents/${documentId}`,
    { method: 'DELETE', headers: getManagementHeaders() },
  )
  if (!response.ok) throw new Error(`Failed to delete document: ${response.status}`)
}
