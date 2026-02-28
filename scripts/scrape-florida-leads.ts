#!/usr/bin/env npx tsx
/**
 * Florida Commercial Property Sales Scraper
 *
 * Scrapes recent commercial property sales (industrial + office, $700K–$7M)
 * from Palm Beach + Broward county property appraiser sites using Playwright.
 *
 * PBC form fields (discovered via HTML analysis):
 *   - PropertyType hidden: R=Residential, C=Commercial, V=Vacant
 *   - hdnSalesSearchType hidden: SUB, MUNI, SN, ZIP, RTS, CONDO
 *   - Municipality select: city names incl "Countywide"
 *   - SaleDateFrom/SaleDateTo: dates
 *   - SalePriceFrom/salePriceTo: prices
 *   - SaleFilter radio: AS=All Sales, QS=Qualified Sale
 *   - Form action: GetSalesSearch (POST)
 *
 * Usage:
 *   npx playwright install chromium   # first time only
 *   npx tsx scripts/scrape-florida-leads.ts
 */

import { chromium, type Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

interface Lead {
  propertyAddress: string
  propertyCity: string
  propertyCounty: string
  propertyState: string
  propertyZip: string
  propertyType: string
  salePrice: string
  saleDate: string
  parcelId: string
  buyerName: string
  sellerName: string
  squareFootage: string
  yearBuilt: string
  source: string
}

const OUTPUT_DIR = path.join(__dirname, 'output')

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

function sanitizeCsv(v: string): string {
  if (!v) return ''
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function writeCsv(leads: Lead[], filename: string): string {
  ensureDir()
  const h = ['property_address','property_city','property_county','property_state','property_zip',
    'property_type','sale_price','sale_date','parcel_id','buyer_name','seller_name',
    'square_footage','year_built','source']
  const rows = leads.map(l => [l.propertyAddress,l.propertyCity,l.propertyCounty,l.propertyState,
    l.propertyZip,l.propertyType,l.salePrice,l.saleDate,l.parcelId,l.buyerName,l.sellerName,
    l.squareFootage,l.yearBuilt,l.source].map(sanitizeCsv).join(','))
  const fp = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(fp, [h.join(','), ...rows].join('\n'), 'utf-8')
  console.log(`  ✅ Wrote ${leads.length} leads → ${fp}`)
  return fp
}

// ─── Palm Beach County ───────────────────────────────────────────────────────
// POST form to /AdvSearch/GetSalesSearch
async function scrapePalmBeach(): Promise<Lead[]> {
  console.log('\n🔍 Scraping Palm Beach County (pbcpao.gov)...')
  const leads: Lead[] = []
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  ensureDir()

  // Key municipalities with commercial activity
  const municipalities = [
    'Boca Raton', 'West Palm Beach', 'Delray Beach', 'Palm Beach Gardens',
    'Boynton Beach', 'Jupiter', 'Lake Worth Beach', 'Wellington',
    'Royal Palm Beach', 'Riviera Beach', 'Palm Beach', 'Greenacres',
    'Lantana', 'North Palm Beach', 'Unincorporated',
  ]

  try {
    for (const muni of municipalities) {
      console.log(`\n  Searching: ${muni}...`)

      await page.goto('https://pbcpao.gov/AdvSearch/SalesSearch', {
        waitUntil: 'networkidle', timeout: 60000,
      })
      await page.waitForTimeout(1500)

      // 1. Set property type to Commercial via JavaScript
      await page.evaluate(() => {
        const ptField = document.getElementById('PropertyType') as HTMLInputElement
        if (ptField) ptField.value = 'C'
        // Highlight the Commercial tab visually
        document.querySelectorAll('.nav-item .nav-link').forEach(el => el.classList.remove('highlighedProprtyType'))
        const commTab = document.getElementById('PropertyType_C')
        if (commTab) commTab.classList.add('highlighedProprtyType')
      })

      // 2. Click Municipality radio to switch search mode
      await page.evaluate(() => {
        const muniRadio = document.querySelector('input[name="SaleSrchType"][value="MUNI"]') as HTMLInputElement
        if (muniRadio) {
          muniRadio.checked = true
          muniRadio.dispatchEvent(new Event('change', { bubbles: true }))
        }
        // Also set the hidden field directly
        const hidden = document.getElementById('hdnSalesSearchType') as HTMLInputElement
        if (hidden) hidden.value = 'MUNI'
        // Show municipality div
        const muniDiv = document.getElementById('divMunicipality')
        if (muniDiv) muniDiv.style.display = ''
      })
      await page.waitForTimeout(500)

      // 3. Select municipality
      await page.selectOption('#Municipality', { label: muni })
      await page.waitForTimeout(300)

      // 4. Set date range
      await page.selectOption('#SelectedSaleDate', { label: 'Custom Date Range' })
      await page.waitForTimeout(300)
      await page.evaluate(() => {
        const from = document.getElementById('SaleDateFrom') as HTMLInputElement
        const to = document.getElementById('SaleDateTo') as HTMLInputElement
        if (from) from.value = '02/01/2025'
        if (to) to.value = '01/31/2026'
      })

      // 5. Set price range
      await page.evaluate(() => {
        const min = document.getElementById('SalePriceFrom') as HTMLInputElement
        const max = document.getElementById('salePriceTo') as HTMLInputElement
        if (min) min.value = '700000'
        if (max) max.value = '7000000'
      })

      // 6. Set sale filter to "All Sales"
      await page.evaluate(() => {
        const radio = document.querySelector('input[name="SaleFilter"][value="AS"]') as HTMLInputElement
        if (radio) radio.checked = true
      })

      // 7. Submit the form via JavaScript
      await page.evaluate(() => {
        const form = document.getElementById('saleForm') as HTMLFormElement
        if (form) form.submit()
      })

      // Wait for the results page to load
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 })
      } catch {
        // Navigation might not trigger if it's same-page
        await page.waitForTimeout(8000)
      }

      // Screenshot first search
      if (muni === municipalities[0]) {
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'pbc-results.png'), fullPage: true })
      }

      // Check current URL
      const currentUrl = page.url()
      console.log(`    URL: ${currentUrl}`)

      // Parse the results page
      // Look for DataTables-styled results
      const pageContent = await page.content()

      // Check for results table
      const tables = await page.locator('table').all()
      for (const table of tables) {
        const ths = await table.locator('th').allTextContents()
        const cleanThs = ths.map(t => t.trim().toLowerCase())

        // Skip non-data tables
        if (cleanThs.some(h => ['su','mo','tu','we','th','fr','sa'].includes(h))) continue
        if (cleanThs.length < 4) continue

        // Check if it's a results table
        const isResults = cleanThs.some(h =>
          h.includes('address') || h.includes('pcn') || h.includes('parcel') ||
          h.includes('price') || h.includes('sale') || h.includes('consideration') ||
          h.includes('grantor') || h.includes('grantee') || h.includes('buyer')
        )
        if (!isResults) continue

        console.log(`    Table: ${cleanThs.join(' | ')}`)
        const rows = await table.locator('tbody tr').all()
        console.log(`    ${rows.length} rows`)

        for (const row of rows) {
          const cells = await row.locator('td').allTextContents()
          if (cells.length < 3) continue

          const get = (keys: string[]) => {
            for (const k of keys) {
              const idx = cleanThs.findIndex(h => h.includes(k))
              if (idx >= 0 && idx < cells.length) return cells[idx].trim()
            }
            return ''
          }

          const price = get(['price','amount','consideration']).replace(/[^0-9.]/g, '')
          const pn = parseFloat(price)
          if (!price || isNaN(pn)) continue
          // Price filter already applied in form, but double-check
          if (pn < 700000 || pn > 7000000) continue

          leads.push({
            propertyAddress: get(['address','location','situs']),
            propertyCity: muni,
            propertyCounty: 'Palm Beach',
            propertyState: 'FL',
            propertyZip: get(['zip']),
            propertyType: get(['use','type','class','dor']).toLowerCase().includes('office') ? 'office' : 'industrial',
            salePrice: price,
            saleDate: get(['date','recorded','sale date']),
            parcelId: get(['parcel','pcn','folio','master']),
            buyerName: get(['buyer','grantee','purchaser']),
            sellerName: get(['seller','grantor']),
            squareFootage: get(['sqft','square','footage','bldg']),
            yearBuilt: get(['year','built']),
            source: 'pbcpao.gov',
          })
        }
      }

      // If no table found, check for card/div-based results
      if (leads.length === 0 && tables.length > 0) {
        // Check for any visible results text
        const bodyText = await page.locator('body').innerText()
        const resultIndicators = ['record', 'result', 'found', 'showing', 'sale']
        for (const indicator of resultIndicators) {
          const match = bodyText.match(new RegExp(`\\d+\\s*${indicator}`, 'i'))
          if (match) {
            console.log(`    Page text: "${match[0]}"`)
            break
          }
        }
      }

      // Try CSV export if available
      const exportBtn = page.locator('button, a').filter({ hasText: /csv|export/i }).first()
      if (await exportBtn.count() && await exportBtn.isVisible()) {
        console.log(`    Found CSV export button`)
        try {
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
            exportBtn.click({ force: true }),
          ])
          if (download) {
            const dlPath = path.join(OUTPUT_DIR, `pbc-${muni.replace(/\s/g, '-')}.csv`)
            await download.saveAs(dlPath)
            console.log(`    ✅ Downloaded: ${dlPath}`)

            // Parse the downloaded CSV
            const csvContent = fs.readFileSync(dlPath, 'utf-8')
            const csvLines = csvContent.split('\n').filter(l => l.trim())
            console.log(`    CSV has ${csvLines.length} lines`)

            if (csvLines.length > 1) {
              const headers = csvLines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
              console.log(`    CSV headers: ${headers.join(' | ')}`)

              for (let i = 1; i < csvLines.length; i++) {
                // Simple CSV parse (doesn't handle quoted commas perfectly)
                const cells = csvLines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
                const getCSV = (keys: string[]) => {
                  for (const k of keys) {
                    const idx = headers.findIndex(h => h.includes(k))
                    if (idx >= 0 && idx < cells.length) return cells[idx]
                  }
                  return ''
                }

                const price = getCSV(['price','amount','consideration']).replace(/[^0-9.]/g, '')
                const pn = parseFloat(price)
                if (!price || isNaN(pn) || pn < 700000 || pn > 7000000) continue

                leads.push({
                  propertyAddress: getCSV(['address','location','situs']),
                  propertyCity: muni,
                  propertyCounty: 'Palm Beach',
                  propertyState: 'FL',
                  propertyZip: getCSV(['zip']),
                  propertyType: getCSV(['use','type','class','dor']).toLowerCase().includes('office') ? 'office' : 'industrial',
                  salePrice: price,
                  saleDate: getCSV(['date','recorded']),
                  parcelId: getCSV(['parcel','pcn','folio','master']),
                  buyerName: getCSV(['buyer','grantee']),
                  sellerName: getCSV(['seller','grantor']),
                  squareFootage: getCSV(['sqft','square','footage']),
                  yearBuilt: getCSV(['year','built']),
                  source: 'pbcpao.gov',
                })
              }
            }
          }
        } catch { console.log(`    Export failed`) }
      }

      // Save the results page HTML for the first search (for debugging)
      if (muni === municipalities[0]) {
        fs.writeFileSync(path.join(OUTPUT_DIR, 'pbc-results-page.html'), pageContent, 'utf-8')
        console.log('    Saved results HTML')
      }

      console.log(`    Running total: ${leads.length} leads`)
    }

  } catch (error) {
    console.error('  ❌ Error:', error instanceof Error ? error.message : error)
  } finally {
    await browser.close()
  }

  console.log(`  Total Palm Beach leads: ${leads.length}`)
  return leads
}

// ─── Broward County ──────────────────────────────────────────────────────────
// The Broward BCPA API returns empty data for all queries (likely anti-scraping).
// We'll try a different approach: use Playwright in non-headless mode and
// capture the rendered results after filling the form via proper keyboard/mouse.
async function scrapeBroward(): Promise<Lead[]> {
  console.log('\n🔍 Scraping Broward County (web.bcpa.net)...')
  const leads: Lead[] = []
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  ensureDir()

  // Track API calls
  const apiCalls: { url: string; body: string }[] = []
  page.on('response', async (resp) => {
    if (resp.url().includes('getSaleTypeResult')) {
      try {
        apiCalls.push({ url: resp.url(), body: await resp.text() })
      } catch { /* ignore */ }
    }
  })

  for (const propType of ['Commercial', 'Industrial'] as const) {
    console.log(`\n  ── ${propType} ──`)
    apiCalls.length = 0

    try {
      await page.goto('https://web.bcpa.net/BcpaClient/#/Sales-Search', {
        waitUntil: 'networkidle', timeout: 60000,
      })
      await page.waitForTimeout(5000)

      // Select property type
      await page.selectOption('#propertyTypeId', { label: propType })
      await page.waitForTimeout(1500)

      // Click custom date radio with force
      await page.locator('#dateRange2').click({ force: true })
      await page.waitForTimeout(1000)

      // Fill start date: click, select all, type
      await page.locator('#txtStartDate').click({ force: true })
      await page.waitForTimeout(200)
      await page.keyboard.press('Meta+a')
      await page.keyboard.type('02/01/2025', { delay: 30 })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Fill end date
      await page.locator('#txtEndDate').click({ force: true })
      await page.waitForTimeout(200)
      await page.keyboard.press('Meta+a')
      await page.keyboard.type('01/31/2026', { delay: 30 })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Fill min amount
      await page.locator('#txtConsiderationMinAmount').click({ force: true })
      await page.keyboard.press('Meta+a')
      await page.keyboard.type('700000', { delay: 20 })
      await page.waitForTimeout(200)

      // Fill max amount
      await page.locator('#txtConsiderationMaxAmount').click({ force: true })
      await page.keyboard.press('Meta+a')
      await page.keyboard.type('7000000', { delay: 20 })
      await page.waitForTimeout(200)

      // Screenshot form
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `broward-${propType.toLowerCase()}-form.png`),
        fullPage: true,
      })

      // Click search
      await page.locator('#btnSearchSales').click({ force: true })
      console.log('  Clicked Search')
      await page.waitForTimeout(12000)

      // Screenshot results
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `broward-${propType.toLowerCase()}-results.png`),
        fullPage: true,
      })

      // Check API responses
      for (const call of apiCalls) {
        try {
          const parsed = JSON.parse(call.body)
          const items = parsed.d || parsed
          if (Array.isArray(items)) {
            const real = items.filter((i: any) => i.folioNumber && i.folioNumber !== '0' && i.propertyAddress)
            console.log(`  API: ${items.length} items, ${real.length} with data`)
            for (const item of real) {
              const price = String(item.price || '').replace(/[^0-9.]/g, '')
              leads.push({
                propertyAddress: item.propertyAddress || '',
                propertyCity: '',
                propertyCounty: 'Broward',
                propertyState: 'FL',
                propertyZip: '',
                propertyType: propType === 'Industrial' ? 'industrial' : 'office',
                salePrice: price,
                saleDate: item.saleDate || '',
                parcelId: item.folioNumber || '',
                buyerName: '',
                sellerName: '',
                squareFootage: '',
                yearBuilt: '',
                source: 'bcpa.net',
              })
            }
          }
        } catch { /* not json */ }
      }

      // Check rendered results
      const bodyText = await page.locator('body').innerText()
      const hasResults = bodyText.includes('Folio') || bodyText.includes('Address') || bodyText.includes('Sale Price')
      if (hasResults) {
        console.log('  Page has result indicators')
        // Look for result rows (Angular ng-repeat)
        const resultRows = await page.locator('[ng-repeat], .search-result-row, tr.result-row').count()
        console.log(`  ng-repeat/result rows: ${resultRows}`)
      }

      // Save body for debugging
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `broward-${propType.toLowerCase()}-body.txt`),
        bodyText,
        'utf-8',
      )

    } catch (err) {
      console.error(`  ❌ Error:`, err instanceof Error ? err.message : err)
    }
  }

  await browser.close()
  console.log(`  Total Broward leads: ${leads.length}`)
  return leads
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Florida Commercial Property Sales Scraper')
  console.log('  Industrial & Office | $700K–$7M | Feb 2025–Jan 2026')
  console.log('═══════════════════════════════════════════════════════')

  ensureDir()
  const allLeads: Lead[] = []

  const pbLeads = await scrapePalmBeach()
  allLeads.push(...pbLeads)

  const brLeads = await scrapeBroward()
  allLeads.push(...brLeads)

  // Deduplicate by parcel ID or address+date
  const seen = new Set<string>()
  const deduped = allLeads.filter(l => {
    const key = l.parcelId || `${l.propertyAddress}-${l.saleDate}`
    if (!key || key === '-') return true
    if (!seen.has(key)) { seen.add(key); return true }
    return false
  })

  console.log(`\n📊 Summary:`)
  console.log(`  Palm Beach: ${pbLeads.length}`)
  console.log(`  Broward: ${brLeads.length}`)
  console.log(`  Total (deduped): ${deduped.length}`)

  if (deduped.length > 0) {
    writeCsv(deduped, 'florida-leads.csv')
    console.log(`\n📁 Import into Boca Banker:`)
    console.log(`   Go to /leads → Import CSV → upload florida-leads.csv`)
  } else {
    console.log(`\n⚠️  No leads scraped automatically.`)
    console.log(`  The county websites use anti-bot protections.`)
    console.log(`\n  📋 Manual export instructions:`)
    console.log(`  ─────────────────────────────────`)
    console.log(`  1. Palm Beach County:`)
    console.log(`     https://pbcpao.gov/AdvSearch/SalesSearch`)
    console.log(`     → Click "Commercial" tab`)
    console.log(`     → Select "Municipality" radio → pick city or "Countywide"`)
    console.log(`     → Custom Date Range: 02/01/2025 – 01/31/2026`)
    console.log(`     → Price Range: 700000 – 7000000`)
    console.log(`     → Click Search → Click "CSV" button to export`)
    console.log(``)
    console.log(`  2. Broward County:`)
    console.log(`     https://web.bcpa.net/BcpaClient/#/Sales-Search`)
    console.log(`     → Property Type: Commercial (then repeat for Industrial)`)
    console.log(`     → Start Date/End Date: 02/01/2025 – 01/31/2026`)
    console.log(`     → Min Amount: 700000, Max Amount: 7000000`)
    console.log(`     → Click Search`)
    console.log(``)
    console.log(`  3. Import CSV files at: /leads → Import CSV`)
  }

  console.log('\n📸 Screenshots saved to scripts/output/')
}

main().catch(console.error)
