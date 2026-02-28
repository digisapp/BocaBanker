#!/usr/bin/env npx tsx
/**
 * Florida Statewide Commercial Property Sales Downloader
 *
 * Downloads Sale Data Files (SDF) and Name-Address-Legal (NAL) files from
 * FL Department of Revenue for ALL 67 counties, filters for commercial/industrial
 * sales ($700K–$7M, Feb 2025–Jan 2026), and joins to produce a leads CSV.
 *
 * Data source: FL DOR PTO Data Portal (SharePoint)
 * SDF = sale records (parcel, price, date, DOR use code)
 * NAL = parcel details (address, owner, sq ft, year built)
 *
 * DOR Use Codes:
 *   Office:     017 (1-story), 018 (multi-story), 019 (professional)
 *   Industrial: 041-049 (manufacturing, warehouse, distribution)
 *   Commercial: 011-016, 020-039 (stores, retail, mixed-use, etc.)
 *
 * Usage: npx tsx scripts/download-statewide-sdf.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const OUTPUT_DIR = path.join(__dirname, 'output')
const SDF_DIR = path.join(OUTPUT_DIR, 'sdf')
const NAL_DIR = path.join(OUTPUT_DIR, 'nal')

const BASE_URL = 'https://floridarevenue.com'
const SDF_API = `${BASE_URL}/property/dataportal/_api/web/GetFolderByServerRelativeUrl('/property/dataportal/Documents/PTO%20Data%20Portal/Tax%20Roll%20Data%20Files/SDF/2025F')/Files`
const NAL_API = `${BASE_URL}/property/dataportal/_api/web/GetFolderByServerRelativeUrl('/property/dataportal/Documents/PTO%20Data%20Portal/Tax%20Roll%20Data%20Files/NAL/2025F')/Files`

// FL county codes and names
const COUNTY_NAMES: Record<string, string> = {
  '11': 'Alachua', '12': 'Baker', '13': 'Bay', '14': 'Bradford', '15': 'Brevard',
  '16': 'Broward', '17': 'Calhoun', '18': 'Charlotte', '19': 'Citrus', '20': 'Clay',
  '21': 'Collier', '22': 'Columbia', '23': 'Dade', '24': 'DeSoto', '25': 'Dixie',
  '26': 'Duval', '27': 'Escambia', '28': 'Flagler', '29': 'Franklin', '30': 'Gadsden',
  '31': 'Gilchrist', '32': 'Glades', '33': 'Gulf', '34': 'Hamilton', '35': 'Hardee',
  '36': 'Hendry', '37': 'Hernando', '38': 'Highlands', '39': 'Hillsborough', '40': 'Holmes',
  '41': 'Indian River', '42': 'Jackson', '43': 'Jefferson', '44': 'Lafayette', '45': 'Lake',
  '46': 'Lee', '47': 'Leon', '48': 'Levy', '49': 'Liberty', '50': 'Madison',
  '51': 'Manatee', '52': 'Marion', '53': 'Martin', '54': 'Monroe', '55': 'Nassau',
  '56': 'Okaloosa', '57': 'Okeechobee', '58': 'Orange', '59': 'Osceola', '60': 'Palm Beach',
  '61': 'Pasco', '62': 'Pinellas', '63': 'Polk', '64': 'Putnam', '65': 'Santa Rosa',
  '66': 'Saint Lucie', '67': 'Saint Johns', '68': 'Sarasota', '69': 'Seminole', '70': 'Sumter',
  '71': 'Suwannee', '72': 'Taylor', '73': 'Union', '74': 'Volusia', '75': 'Wakulla',
  '76': 'Walton', '77': 'Washington',
}

// DOR Use Code categories
function getPropertyType(dorUC: string): string | null {
  const code = parseInt(dorUC, 10)
  if (code >= 17 && code <= 19) return 'office'
  if (code >= 41 && code <= 49) return 'industrial'
  if (code >= 11 && code <= 16) return 'retail'
  if (code >= 20 && code <= 39) return 'other'
  return null // not commercial/industrial
}

function getPropertyTypeLabel(dorUC: string): string {
  const code = parseInt(dorUC, 10)
  const labels: Record<number, string> = {
    11: 'store', 12: 'mixed-use', 13: 'department store', 14: 'supermarket',
    15: 'regional shopping center', 16: 'community shopping center',
    17: 'office (1-story)', 18: 'office (multi-story)', 19: 'professional services',
    20: 'terminal/transit', 21: 'restaurant', 22: 'drive-in restaurant',
    23: 'bank/financial', 24: 'insurance office', 25: 'repair service',
    26: 'service station', 27: 'auto sales', 28: 'parking',
    29: 'wholesale', 30: 'florist/greenhouse', 31: 'drive-in theater',
    32: 'theater', 33: 'nightclub/bar', 34: 'bowling alley',
    35: 'tourist attraction', 36: 'camp', 37: 'race track',
    38: 'golf course', 39: 'hotel/motel',
    41: 'light manufacturing', 42: 'heavy manufacturing', 43: 'lumber yard',
    44: 'packing plant', 45: 'bottling plant', 46: 'food processing',
    47: 'mineral processing', 48: 'warehouse/distribution', 49: 'open storage',
  }
  return labels[code] || `commercial (${dorUC})`
}

interface SaleRecord {
  countyNo: string
  parcelId: string
  dorUC: string
  salePrice: number
  saleYear: number
  saleMonth: number
  orBook: string
  orPage: string
  qualCode: string
}

interface LeadRecord {
  property_address: string
  property_city: string
  property_county: string
  property_state: string
  property_zip: string
  property_type: string
  property_type_detail: string
  sale_price: string
  sale_date: string
  parcel_id: string
  buyer_name: string
  seller_name: string
  square_footage: string
  year_built: string
  land_value: string
  building_value: string
  or_book_page: string
  source: string
}

function sanitizeCsv(v: string): string {
  if (!v) return ''
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  fields.push(current.trim())
  return fields
}

async function fetchFileList(apiUrl: string): Promise<{ name: string; url: string; size: number }[]> {
  const resp = await fetch(apiUrl, { headers: { Accept: 'application/json' } })
  const data = await resp.json() as any
  return (data.value || []).map((f: any) => ({
    name: f.Name,
    url: BASE_URL + f.ServerRelativeUrl,
    size: parseInt(f.Length || '0', 10),
  }))
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return false
    const buffer = Buffer.from(await resp.arrayBuffer())
    fs.writeFileSync(dest, buffer)
    return true
  } catch { return false }
}

function unzipFile(zipPath: string, outDir: string): string[] {
  try {
    execSync(`unzip -o "${zipPath}" -d "${outDir}" 2>/dev/null`, { stdio: 'pipe' })
    return fs.readdirSync(outDir).filter(f => f.endsWith('.csv') && !f.startsWith('.'))
  } catch { return [] }
}

// ─── Stage 1: Download and parse all SDF files ──────────────────────────────
async function downloadAndFilterSDF(): Promise<Map<string, SaleRecord[]>> {
  console.log('\n📥 Stage 1: Downloading SDF files (40 MB)...')
  fs.mkdirSync(SDF_DIR, { recursive: true })

  const files = await fetchFileList(SDF_API)
  console.log(`  Found ${files.length} SDF files`)

  const countyMatches = new Map<string, SaleRecord[]>()
  let totalSales = 0
  let matchingSales = 0

  // Download in batches of 10
  const batchSize = 10
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const progress = Math.min(i + batchSize, files.length)
    process.stdout.write(`  Downloading: ${progress}/${files.length}...\r`)

    await Promise.all(batch.map(async (file) => {
      const zipPath = path.join(SDF_DIR, file.name.replace(/[^a-zA-Z0-9.]/g, '_'))
      if (!await downloadFile(file.url, zipPath)) return

      const csvFiles = unzipFile(zipPath, SDF_DIR)
      for (const csvFile of csvFiles) {
        if (!csvFile.startsWith('SDF')) continue
        const csvPath = path.join(SDF_DIR, csvFile)
        const content = fs.readFileSync(csvPath, 'utf-8')
        const lines = content.split('\n')
        if (lines.length < 2) continue

        const headers = parseCsvLine(lines[0])
        const idx = (name: string) => headers.indexOf(name)

        for (let j = 1; j < lines.length; j++) {
          if (!lines[j].trim()) continue
          const cells = parseCsvLine(lines[j])
          totalSales++

          const dorUC = cells[idx('DOR_UC')]?.replace(/"/g, '')
          const propType = getPropertyType(dorUC)
          if (!propType) continue // Not commercial/industrial

          const salePrice = parseInt(cells[idx('SALE_PRC')] || '0', 10)
          if (salePrice < 700000 || salePrice > 7000000) continue

          const saleYear = parseInt(cells[idx('SALE_YR')] || '0', 10)
          const saleMonth = parseInt(cells[idx('SALE_MO')] || '0', 10)

          // Feb 2025 – Jan 2026
          const inRange = (saleYear === 2025 && saleMonth >= 2) ||
                          (saleYear === 2026 && saleMonth <= 1)
          if (!inRange) continue

          const countyNo = cells[idx('CO_NO')]?.replace(/"/g, '')
          const record: SaleRecord = {
            countyNo,
            parcelId: cells[idx('PARCEL_ID')]?.replace(/"/g, ''),
            dorUC,
            salePrice,
            saleYear,
            saleMonth,
            orBook: cells[idx('OR_BOOK')]?.replace(/"/g, '') || '',
            orPage: cells[idx('OR_PAGE')]?.replace(/"/g, '') || '',
            qualCode: cells[idx('QUAL_CD')]?.replace(/"/g, '') || '',
          }

          if (!countyMatches.has(countyNo)) countyMatches.set(countyNo, [])
          countyMatches.get(countyNo)!.push(record)
          matchingSales++
        }

        // Clean up CSV to save disk space
        fs.unlinkSync(csvPath)
      }
      // Clean up zip
      fs.unlinkSync(zipPath)
    }))
  }

  console.log(`\n  Total sales records: ${totalSales.toLocaleString()}`)
  console.log(`  Matching (commercial/industrial, $700K-$7M, Feb 2025-Jan 2026): ${matchingSales}`)
  console.log(`  Counties with matches: ${countyMatches.size}`)

  // Show per-county counts
  const sorted = [...countyMatches.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [co, records] of sorted.slice(0, 15)) {
    console.log(`    ${COUNTY_NAMES[co] || co}: ${records.length}`)
  }
  if (sorted.length > 15) console.log(`    ... and ${sorted.length - 15} more counties`)

  return countyMatches
}

// ─── Stage 2: Download NAL files for matching counties, join data ────────────
async function downloadNALAndJoin(countyMatches: Map<string, SaleRecord[]>): Promise<LeadRecord[]> {
  console.log('\n📥 Stage 2: Downloading NAL files for matching counties...')
  fs.mkdirSync(NAL_DIR, { recursive: true })

  const nalFiles = await fetchFileList(NAL_API)

  // Build parcel lookup: countyNo -> Set of parcelIds
  const parcelLookup = new Map<string, Map<string, SaleRecord>>()
  for (const [countyNo, records] of countyMatches) {
    const parcels = new Map<string, SaleRecord>()
    for (const r of records) parcels.set(r.parcelId, r)
    parcelLookup.set(countyNo, parcels)
  }

  const leads: LeadRecord[] = []
  let nalCount = 0
  const totalNAL = countyMatches.size

  for (const [countyNo, saleRecords] of countyMatches) {
    nalCount++
    const countyName = COUNTY_NAMES[countyNo] || `County ${countyNo}`
    process.stdout.write(`  NAL ${nalCount}/${totalNAL}: ${countyName} (${saleRecords.length} sales)...\r`)

    // Find NAL file for this county
    const nalFile = nalFiles.find(f => {
      const match = f.name.match(/(\d+)\s+Final/)
      return match && match[1] === countyNo
    })
    if (!nalFile) {
      console.log(`  ⚠️  NAL not found for county ${countyNo} (${countyName})`)
      // Still add sales without address info
      for (const sale of saleRecords) {
        leads.push({
          property_address: '',
          property_city: '',
          property_county: countyName,
          property_state: 'FL',
          property_zip: '',
          property_type: getPropertyType(sale.dorUC) || 'other',
          property_type_detail: getPropertyTypeLabel(sale.dorUC),
          sale_price: String(sale.salePrice),
          sale_date: `${sale.saleYear}-${String(sale.saleMonth).padStart(2, '0')}`,
          parcel_id: sale.parcelId,
          buyer_name: '',
          seller_name: '',
          square_footage: '',
          year_built: '',
          land_value: '',
          building_value: '',
          or_book_page: sale.orBook && sale.orPage ? `${sale.orBook}/${sale.orPage}` : '',
          source: 'FL DOR SDF',
        })
      }
      continue
    }

    const zipPath = path.join(NAL_DIR, nalFile.name.replace(/[^a-zA-Z0-9.]/g, '_'))
    if (!await downloadFile(nalFile.url, zipPath)) {
      console.log(`  ❌ Failed to download NAL for ${countyName}`)
      continue
    }

    const csvFiles = unzipFile(zipPath, NAL_DIR)
    const parcels = parcelLookup.get(countyNo)!

    for (const csvFile of csvFiles) {
      if (!csvFile.startsWith('NAL')) continue
      const csvPath = path.join(NAL_DIR, csvFile)
      const content = fs.readFileSync(csvPath, 'utf-8')
      const lines = content.split('\n')
      if (lines.length < 2) continue

      const headers = parseCsvLine(lines[0])
      const idx = (name: string) => headers.indexOf(name)

      for (let j = 1; j < lines.length; j++) {
        if (!lines[j].trim()) continue
        const cells = parseCsvLine(lines[j])
        const parcelId = cells[idx('PARCEL_ID')]?.replace(/"/g, '')
        if (!parcels.has(parcelId)) continue

        const sale = parcels.get(parcelId)!

        leads.push({
          property_address: [
            cells[idx('PHY_ADDR1')]?.replace(/"/g, '').trim(),
            cells[idx('PHY_ADDR2')]?.replace(/"/g, '').trim(),
          ].filter(Boolean).join(' '),
          property_city: cells[idx('PHY_CITY')]?.replace(/"/g, '').trim() || '',
          property_county: countyName,
          property_state: 'FL',
          property_zip: cells[idx('PHY_ZIPCD')]?.replace(/"/g, '').trim() || '',
          property_type: getPropertyType(sale.dorUC) || 'other',
          property_type_detail: getPropertyTypeLabel(sale.dorUC),
          sale_price: String(sale.salePrice),
          sale_date: `${sale.saleYear}-${String(sale.saleMonth).padStart(2, '0')}`,
          parcel_id: parcelId,
          buyer_name: cells[idx('OWN_NAME')]?.replace(/"/g, '').trim() || '',
          seller_name: '', // Not in NAL/SDF
          square_footage: cells[idx('TOT_LVG_AREA')]?.replace(/"/g, '').trim() || '',
          year_built: cells[idx('EFF_YR_BLT')]?.replace(/"/g, '').trim() || '',
          land_value: cells[idx('LND_VAL')]?.replace(/"/g, '').trim() || '',
          building_value: String(
            (parseInt(cells[idx('JV')] || '0', 10) || 0) -
            (parseInt(cells[idx('LND_VAL')] || '0', 10) || 0)
          ),
          or_book_page: sale.orBook && sale.orPage ? `${sale.orBook}/${sale.orPage}` : '',
          source: 'FL DOR',
        })

        // Remove from parcels to track unmatched
        parcels.delete(parcelId)
      }

      fs.unlinkSync(csvPath)
    }

    // Add any unmatched sales (parcel not found in NAL)
    for (const [pid, sale] of parcels) {
      leads.push({
        property_address: '',
        property_city: '',
        property_county: countyName,
        property_state: 'FL',
        property_zip: '',
        property_type: getPropertyType(sale.dorUC) || 'other',
        property_type_detail: getPropertyTypeLabel(sale.dorUC),
        sale_price: String(sale.salePrice),
        sale_date: `${sale.saleYear}-${String(sale.saleMonth).padStart(2, '0')}`,
        parcel_id: pid,
        buyer_name: '',
        seller_name: '',
        square_footage: '',
        year_built: '',
        land_value: '',
        building_value: '',
        or_book_page: sale.orBook && sale.orPage ? `${sale.orBook}/${sale.orPage}` : '',
        source: 'FL DOR SDF',
      })
    }

    fs.unlinkSync(zipPath)
  }

  console.log(`\n  Matched ${leads.filter(l => l.property_address).length}/${leads.length} leads with addresses`)
  return leads
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Florida Statewide Commercial Property Sales Downloader')
  console.log('  All 67 Counties | $700K–$7M | Feb 2025–Jan 2026')
  console.log('  Data: FL Dept of Revenue, Property Tax Oversight')
  console.log('═══════════════════════════════════════════════════════════')

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Stage 1: Download & filter SDF
  const countyMatches = await downloadAndFilterSDF()

  if (countyMatches.size === 0) {
    console.log('\n⚠️  No matching sales found!')
    return
  }

  // Stage 2: Download NAL & join
  const leads = await downloadNALAndJoin(countyMatches)

  // Deduplicate by parcel ID
  const seen = new Set<string>()
  const deduped = leads.filter(l => {
    const key = `${l.property_county}-${l.parcel_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Write CSV
  const headers = [
    'property_address', 'property_city', 'property_county', 'property_state',
    'property_zip', 'property_type', 'property_type_detail', 'sale_price', 'sale_date',
    'parcel_id', 'buyer_name', 'seller_name', 'square_footage', 'year_built',
    'land_value', 'building_value', 'or_book_page', 'source',
  ]
  const rows = deduped.map(l =>
    headers.map(h => sanitizeCsv(l[h as keyof LeadRecord])).join(',')
  )
  const outPath = path.join(OUTPUT_DIR, 'florida-leads-statewide.csv')
  fs.writeFileSync(outPath, [headers.join(','), ...rows].join('\n'), 'utf-8')
  console.log(`\n✅ Wrote ${deduped.length} leads → ${outPath}`)

  // Also write the import-compatible CSV (without extra columns)
  const importHeaders = [
    'property_address', 'property_city', 'property_county', 'property_state',
    'property_zip', 'property_type', 'sale_price', 'sale_date', 'parcel_id',
    'buyer_name', 'seller_name', 'square_footage', 'year_built', 'source',
  ]
  const importRows = deduped.map(l =>
    importHeaders.map(h => sanitizeCsv(l[h as keyof LeadRecord])).join(',')
  )
  const importPath = path.join(OUTPUT_DIR, 'florida-leads.csv')
  fs.writeFileSync(importPath, [importHeaders.join(','), ...importRows].join('\n'), 'utf-8')
  console.log(`✅ Wrote ${deduped.length} leads → ${importPath} (import-compatible)`)

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 STATEWIDE SUMMARY')
  console.log('═'.repeat(60))

  // By property type
  const byType: Record<string, number> = {}
  for (const l of deduped) byType[l.property_type] = (byType[l.property_type] || 0) + 1
  console.log('\nBy property type:')
  for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t}: ${c}`)
  }

  // By county (top 20)
  const byCounty: Record<string, number> = {}
  for (const l of deduped) byCounty[l.property_county] = (byCounty[l.property_county] || 0) + 1
  console.log('\nTop 20 counties:')
  const countyList = Object.entries(byCounty).sort((a, b) => b[1] - a[1])
  for (const [co, count] of countyList.slice(0, 20)) {
    console.log(`  ${co}: ${count}`)
  }
  if (countyList.length > 20) console.log(`  ... and ${countyList.length - 20} more`)
  console.log(`\nTotal counties: ${countyList.length}`)

  // Price stats
  const prices = deduped.map(l => parseInt(l.sale_price)).filter(p => !isNaN(p))
  console.log(`\nPrice range: $${Math.min(...prices).toLocaleString()} – $${Math.max(...prices).toLocaleString()}`)
  console.log(`Average: $${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`)

  console.log(`\n📁 Import into Boca Banker:`)
  console.log(`   Go to /leads → Import CSV → upload florida-leads.csv`)

  // Cleanup
  try { fs.rmSync(SDF_DIR, { recursive: true, force: true }) } catch {}
  try { fs.rmSync(NAL_DIR, { recursive: true, force: true }) } catch {}
}

main().catch(console.error)
