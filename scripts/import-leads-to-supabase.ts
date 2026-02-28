#!/usr/bin/env npx tsx
/**
 * Import florida-leads.csv into Supabase leads table
 * Uses Supabase REST API with service role key (no auth required)
 */

import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'

const CSV_PATH = path.join(__dirname, 'output', 'florida-leads.csv')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BATCH_SIZE = 200

/** Parse a CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

async function main() {
  console.log('Importing leads to Supabase...\n')

  const content = fs.readFileSync(CSV_PATH, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  const headers = parseCsvLine(lines[0])

  console.log(`CSV headers: ${headers.join(', ')}`)
  console.log(`Total rows: ${lines.length - 1}\n`)

  const rows: Record<string, any>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const row: Record<string, any> = {}

    // Initialize ALL keys so every row has identical shape (PostgREST requirement)
    for (const key of headers) {
      row[key] = null
    }

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j]
      const val = j < cells.length ? cells[j] : ''

      if (!val) continue

      if (key === 'sale_price') {
        row[key] = parseFloat(val) || null
      } else if (key === 'square_footage' || key === 'year_built') {
        const num = parseInt(val)
        if (!isNaN(num) && num > 0) row[key] = num
      } else if (key === 'sale_date') {
        // Convert "2025-03" to "2025-03-01" for date type
        row[key] = val.length === 7 ? `${val}-01` : val
      } else {
        row[key] = val
      }
    }

    // Ensure required fields
    if (row.property_address && row.property_type) {
      rows.push(row)
    }
  }

  console.log(`Valid rows to import: ${rows.length}\n`)

  let imported = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    })

    if (resp.ok) {
      imported += batch.length
      process.stdout.write(`\r  Imported ${imported}/${rows.length} leads...`)
    } else {
      const err = await resp.text()
      console.error(`\n  Batch ${i}-${i + batch.length} failed: ${err}`)
      errors += batch.length
    }
  }

  console.log(`\n\n════════════════════════════════════`)
  console.log(`Imported: ${imported}`)
  console.log(`Errors:   ${errors}`)
  console.log(`Total:    ${rows.length}`)
}

main().catch(console.error)
