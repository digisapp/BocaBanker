#!/usr/bin/env npx tsx
/**
 * Parse all downloaded PBC CSV exports into a clean florida-leads.csv
 * Handles proper CSV quoting, correct column mapping, and zoning-based property typing
 */

import * as fs from 'fs'
import * as path from 'path'

const OUTPUT_DIR = path.join(__dirname, 'output')

interface Lead {
  property_address: string
  property_city: string
  property_county: string
  property_state: string
  property_zip: string
  property_type: string
  sale_price: string
  sale_date: string
  parcel_id: string
  buyer_name: string
  seller_name: string
  square_footage: string
  year_built: string
  source: string
}

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
        i++ // skip escaped quote
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

/** Determine property type from zoning code */
function getPropertyType(zoning: string, location: string): string {
  const z = zoning.toUpperCase()
  const loc = location.toUpperCase()

  // Industrial/Manufacturing zones
  if (z.startsWith('M-') || z.startsWith('IL') || z.startsWith('IH') ||
      z.startsWith('I-') || z.includes('IND') || z.includes('MANUF') ||
      z.includes('WAREHOUSE')) return 'industrial'

  // Office zones
  if (z.startsWith('O-') || z.startsWith('OC') || z.startsWith('OF') ||
      z.includes('OFFICE') || z.includes('PROF')) return 'office'

  // Retail/Commercial zones
  if (z.startsWith('C-') || z.startsWith('B-') || z.startsWith('GC') ||
      z.startsWith('CC') || z.startsWith('NC') || z.startsWith('SC') ||
      z.includes('COMMERCIAL') || z.includes('RETAIL') || z.includes('SHOP')) return 'office'

  // Mixed use / Downtown
  if (z.includes('MXD') || z.includes('MU') || z.includes('DRI') ||
      z.includes('MIXED') || z.includes('DOWNTOWN') || z.includes('TOD') ||
      z.includes('PUD') || z.includes('PLANNED')) return 'office'

  // Check location for clues
  if (loc.includes('INDUSTRIAL') || loc.includes('WAREHOUSE') || loc.includes('FACTORY')) return 'industrial'
  if (loc.includes('OFFICE') || loc.includes('PLAZA') || loc.includes('PROFESSIONAL')) return 'office'

  // Default to commercial/office for unknown commercial properties
  return 'office'
}

/** Extract zip code from "CITY STATE ZIP" string */
function extractZip(cityStateZip: string): string {
  const match = cityStateZip.match(/\b(\d{5}(?:-?\d{4})?)\b/)
  return match ? match[1].substring(0, 5) : ''
}

function sanitizeCsv(v: string): string {
  if (!v) return ''
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function main() {
  console.log('Parsing PBC CSV exports...\n')

  const csvFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('pbc-') && f.endsWith('.csv'))
  console.log(`Found ${csvFiles.length} CSV files`)

  const allLeads: Lead[] = []

  for (const file of csvFiles) {
    const filepath = path.join(OUTPUT_DIR, file)
    const content = fs.readFileSync(filepath, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    if (lines.length < 2) continue

    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase())
    console.log(`\n${file}: ${lines.length - 1} rows`)

    // Map column indices
    const idx = (key: string): number => headers.findIndex(h => h.includes(key))
    const parcelIdx = idx('parcel')
    const priceIdx = idx('sale price')
    const dateIdx = idx('sale date')
    const ownerIdx = idx('owner')
    const locationIdx = idx('location')
    const muniIdx = idx('municipality')
    const sqftIdx = idx('sq. ft') >= 0 ? idx('sq. ft') : idx('sq ft')
    const mailCityIdx = idx('mail city')
    const zoningIdx = idx('zoning')

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i])
      if (cells.length < 5) continue

      const get = (i: number) => (i >= 0 && i < cells.length) ? cells[i] : ''

      const priceStr = get(priceIdx).replace(/[^0-9.]/g, '')
      const price = parseFloat(priceStr)
      if (isNaN(price) || price < 700000 || price > 7000000) continue

      const location = get(locationIdx)
      const municipality = get(muniIdx)
      const mailCityStateZip = get(mailCityIdx)
      const zoning = get(zoningIdx)
      const sqft = get(sqftIdx).replace(/[^0-9]/g, '')

      allLeads.push({
        property_address: location || '',
        property_city: municipality || '',
        property_county: 'Palm Beach',
        property_state: 'FL',
        property_zip: extractZip(mailCityStateZip),
        property_type: getPropertyType(zoning, location),
        sale_price: priceStr,
        sale_date: get(dateIdx),
        parcel_id: get(parcelIdx),
        buyer_name: get(ownerIdx), // "Owner Name" in PBC = current owner/buyer
        seller_name: '',
        square_footage: sqft !== '0' ? sqft : '',
        year_built: '',
        source: 'pbcpao.gov',
      })
    }
  }

  // Deduplicate by parcel ID
  const seen = new Set<string>()
  const deduped = allLeads.filter(l => {
    const key = l.parcel_id || `${l.property_address}-${l.sale_date}`
    if (!key || key === '-') return true
    if (!seen.has(key)) { seen.add(key); return true }
    return false
  })

  console.log(`\n════════════════════════════════════`)
  console.log(`Total leads: ${allLeads.length}`)
  console.log(`After dedup: ${deduped.length}`)

  // Property type breakdown
  const types: Record<string, number> = {}
  for (const l of deduped) {
    types[l.property_type] = (types[l.property_type] || 0) + 1
  }
  console.log(`\nProperty types:`)
  for (const [type, count] of Object.entries(types).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }

  // City breakdown
  const cities: Record<string, number> = {}
  for (const l of deduped) {
    cities[l.property_city] = (cities[l.property_city] || 0) + 1
  }
  console.log(`\nCities:`)
  for (const [city, count] of Object.entries(cities).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${city}: ${count}`)
  }

  // Price range
  const prices = deduped.map(l => parseFloat(l.sale_price)).filter(p => !isNaN(p))
  console.log(`\nPrice range: $${Math.min(...prices).toLocaleString()} – $${Math.max(...prices).toLocaleString()}`)
  console.log(`Average: $${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`)

  // Write CSV
  const headers = ['property_address','property_city','property_county','property_state','property_zip',
    'property_type','sale_price','sale_date','parcel_id','buyer_name','seller_name',
    'square_footage','year_built','source']
  const rows = deduped.map(l =>
    headers.map(h => sanitizeCsv(l[h as keyof Lead])).join(',')
  )
  const outPath = path.join(OUTPUT_DIR, 'florida-leads.csv')
  fs.writeFileSync(outPath, [headers.join(','), ...rows].join('\n'), 'utf-8')
  console.log(`\n✅ Wrote ${deduped.length} leads → ${outPath}`)

  // Sample output
  console.log('\nSample leads:')
  for (const l of deduped.slice(0, 5)) {
    console.log(`  ${l.property_address} | ${l.property_city} | ${l.property_type} | $${parseFloat(l.sale_price).toLocaleString()} | ${l.sale_date} | ${l.parcel_id}`)
  }
}

main()
