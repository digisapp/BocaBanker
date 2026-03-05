#!/usr/bin/env npx tsx
/**
 * Test RAG search against the xAI collection.
 */

import 'dotenv/config'

const COLLECTION_ID = process.env.XAI_COLLECTION_ID!
const API_KEY = process.env.XAI_API_KEY!

async function search(query: string) {
  const res = await fetch('https://api.x.ai/v1/documents/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      query,
      source: { collection_ids: [COLLECTION_ID] },
      retrieval_mode: { type: 'hybrid' },
      max_results: 3,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    console.log('Error response:', text)
    return { status: res.status, results: [] }
  }
  const data = JSON.parse(text)
  const matches = data.matches || data.results || []
  return { status: res.status, results: matches }
}

async function listDocs() {
  const mgmtKey = process.env.XAI_MANAGEMENT_API_KEY!
  const res = await fetch(
    `https://management-api.x.ai/v1/collections/${COLLECTION_ID}/documents`,
    { headers: { Authorization: `Bearer ${mgmtKey}` } },
  )
  const text = await res.text()
  console.log('=== Documents in collection ===')
  console.log(`Status: ${res.status}`)
  try {
    const data = JSON.parse(text)
    const docs = data.documents || data.data || data
    if (Array.isArray(docs)) {
      console.log(`Count: ${docs.length}`)
      for (const doc of docs) {
        console.log(`  - ${doc.name || doc.title || doc.id} (status: ${doc.status || 'unknown'})`)
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 1000))
    }
  } catch {
    console.log('Raw:', text.substring(0, 500))
  }
}

async function main() {
  await listDocs()
  console.log('')
  const queries = [
    'cost segregation warehouse industrial property',
    'FHA loan requirements first time buyer',
    'Boca Raton real estate market property values',
  ]

  for (const query of queries) {
    console.log(`\n=== Query: "${query}" ===`)
    const { status, results } = await search(query)
    console.log(`Status: ${status}, Results: ${results.length}`)
    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const content = r.chunk_content || r.content || ''
      console.log(`  [${i + 1}] Score: ${r.score?.toFixed(3) ?? 'N/A'} | ${content.substring(0, 120)}...`)
    }
  }
}

main()
