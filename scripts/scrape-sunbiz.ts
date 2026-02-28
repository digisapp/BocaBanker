#!/usr/bin/env npx tsx
/**
 * Sunbiz Scraper — Extracts LLC member/registered agent info from Florida Division of Corporations
 *
 * Usage: npx tsx scripts/scrape-sunbiz.ts [--limit N] [--offset N] [--dry-run]
 */
import 'dotenv/config'
import puppeteer, { type Browser, type Page } from 'puppeteer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Parse CLI args
const args = process.argv.slice(2)
const getArg = (name: string) => {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null
}
const LIMIT = parseInt(getArg('limit') || '0') || 0
const OFFSET = parseInt(getArg('offset') || '0') || 0
const DRY_RUN = args.includes('--dry-run')

interface MemberInfo {
  memberName: string | null
  memberAddress: string | null
  memberCity: string | null
  memberState: string | null
  memberZip: string | null
  sunbizDocNumber: string | null
}

// Clean LLC name for search (remove punctuation, extra spaces)
function cleanSearchTerm(name: string): string {
  return name
    .replace(/,/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Parse "CITY, ST ZIP" or "CITY ST ZIP" format
function parseCityStateZip(text: string): { city: string; state: string; zip: string } {
  const cleaned = text.trim()
  // Try "CITY, ST ZIP" or "CITY ST ZIP"
  const match = cleaned.match(/^(.+?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
  if (match) {
    return { city: match[1].trim(), state: match[2], zip: match[3] }
  }
  return { city: cleaned, state: '', zip: '' }
}

async function searchSunbiz(page: Page, entityName: string): Promise<MemberInfo> {
  const result: MemberInfo = {
    memberName: null,
    memberAddress: null,
    memberCity: null,
    memberState: null,
    memberZip: null,
    sunbizDocNumber: null,
  }

  try {
    // Go to search page
    await page.goto('https://search.sunbiz.org/Inquiry/CorporationSearch/ByName', {
      waitUntil: 'networkidle2',
      timeout: 25000,
    })

    // Clear and type search term
    const searchInput = await page.$('#SearchTerm')
    if (!searchInput) return result

    await searchInput.click({ clickCount: 3 }) // select all
    await searchInput.type(cleanSearchTerm(entityName))

    // Submit search
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }),
      page.click('input[type="submit"], #buttonSearch'),
    ])

    // Find the best matching result
    const detailLink = await page.evaluate((searchName: string) => {
      const links = Array.from(document.querySelectorAll('a'))
        .filter(a => a.href.includes('SearchResultDetail'))

      // Try exact match first
      const normalized = searchName.toUpperCase().replace(/[,.\s]+/g, ' ').trim()
      for (const link of links) {
        const linkText = (link.textContent || '').toUpperCase().replace(/[,.\s]+/g, ' ').trim()
        if (linkText === normalized) return link.href
      }

      // Try starts-with match
      for (const link of links) {
        const linkText = (link.textContent || '').toUpperCase().replace(/[,.\s]+/g, ' ').trim()
        if (linkText.startsWith(normalized.split(' LLC')[0])) return link.href
      }

      // Return first active result if available
      return links[0]?.href || null
    }, entityName)

    if (!detailLink) return result

    // Navigate to detail page
    await page.goto(detailLink, { waitUntil: 'networkidle2', timeout: 25000 })

    // Extract info from detail page using raw text (avoid functions in page.evaluate due to tsx transpiler)
    const pageText = await page.evaluate(() => document.body.innerText)

    // Document number
    const docMatch = pageText.match(/Document Number\s*\n?\s*([A-Z0-9]+)/)
    const docNumber = docMatch?.[1] || null

    // Helper: parse person from a section of text
    function extractPerson(section: string) {
      const lines = section.split('\n').map(l => l.trim()).filter(Boolean)
      let name: string | null = null
      let address: string | null = null
      let cityStateZip: string | null = null

      // Strategy 1: Labeled fields
      for (let i = 0; i < lines.length && i < 25; i++) {
        if (/^Name\b/.test(lines[i]) && !lines[i].includes('& Address')) {
          name = lines[i].replace(/^Name\s*/, '') || lines[i + 1] || null
        }
        if (/^Address\b/.test(lines[i])) {
          address = lines[i].replace(/^Address\s*/, '') || lines[i + 1] || null
        }
        if (/^City-State-Zip/.test(lines[i])) {
          cityStateZip = lines[i].replace(/^City-State-Zip:?\s*/, '') || lines[i + 1] || null
        }
      }

      // Strategy 2: Parse "Title XXX" blocks
      if (!name) {
        for (let i = 0; i < lines.length && i < 25; i++) {
          if (/^Title\s+/.test(lines[i])) {
            for (let j = i + 1; j < lines.length && j < i + 5; j++) {
              const line = lines[j]
              if (!line) continue
              if (/^Title\s+/.test(line)) break
              if (/^Name\b|^Address\b|^City|^Annual|^Document|^Report/.test(line)) break
              if (/[A-Za-z]/.test(line) && !name) {
                name = line
              } else if (name && !address && /\d/.test(line)) {
                address = line
              } else if (name && address && /[A-Z]{2}\s+\d{5}/.test(line)) {
                cityStateZip = line.replace(/\s+US$/, '')
                break
              }
            }
            if (name) break
          }
        }
      }

      return { name, address, cityStateZip }
    }

    let personName: string | null = null
    let personAddress: string | null = null
    let personCityStateZip: string | null = null

    // Try 1: Authorized Person(s) Detail (LLCs)
    const authParts = pageText.split('Authorized Person(s) Detail')
    if (authParts.length > 1) {
      const extracted = extractPerson(authParts[1].substring(0, 1000))
      if (extracted.name) {
        personName = extracted.name
        personAddress = extracted.address
        personCityStateZip = extracted.cityStateZip
      }
    }

    // Try 2: Officer/Director Detail (Corporations)
    if (!personName) {
      const officerParts = pageText.split('Officer/Director Detail')
      if (officerParts.length > 1) {
        const extracted = extractPerson(officerParts[1].substring(0, 1500))
        if (extracted.name) {
          personName = extracted.name
          personAddress = extracted.address
          personCityStateZip = extracted.cityStateZip
        }
      }
    }

    // Try 3: Registered Agent (fallback)
    if (!personName) {
      const agentParts = pageText.split('Registered Agent Name & Address')
      if (agentParts.length > 1) {
        const lines = agentParts[1].split('\n').map(l => l.trim()).filter(Boolean)
        const dataLines = lines.filter(l =>
          !l.startsWith('Address Changed') && !l.startsWith('The above') && l.length > 1
        )
        if (dataLines[0]) personName = dataLines[0]
        if (dataLines[1] && /\d/.test(dataLines[1])) personAddress = dataLines[1]
        if (dataLines[2] && /[A-Z]{2}\s+\d{5}/.test(dataLines[2])) {
          personCityStateZip = dataLines[2].replace(/\s+US$/, '')
        }
      }
    }

    const info = { docNumber, personName, personAddress, personCityStateZip }

    result.sunbizDocNumber = info.docNumber
    result.memberName = info.personName

    if (info.personAddress) {
      result.memberAddress = info.personAddress
    }

    if (info.personCityStateZip) {
      const parsed = (() => {
        const cleaned = info.personCityStateZip.trim().replace(/\s+US$/, '')
        const match = cleaned.match(/^(.+?)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
        if (match) return { city: match[1].trim(), state: match[2], zip: match[3] }
        return { city: cleaned, state: '', zip: '' }
      })()
      result.memberCity = parsed.city || null
      result.memberState = parsed.state || null
      result.memberZip = parsed.zip || null
    }
  } catch (err) {
    console.error(`  [DEBUG] Error in searchSunbiz: ${(err as Error).message}`)
  }

  return result
}

async function main() {
  console.log('Sunbiz Scraper — Extracting LLC member info')
  console.log('='.repeat(50))

  // Fetch leads that are LLCs without member info
  let query = supabase
    .from('leads')
    .select('id, buyer_name')
    .is('member_name', null)
    .or('buyer_name.ilike.%LLC%,buyer_name.ilike.%INC%,buyer_name.ilike.%CORP%,buyer_name.ilike.%TRUST%,buyer_name.ilike.%LTD%')
    .order('sale_price', { ascending: false, nullsFirst: false })

  if (LIMIT > 0) {
    query = query.range(OFFSET, OFFSET + LIMIT - 1)
  } else {
    query = query.limit(5000)
  }

  const { data: leads, error } = await query

  if (error) {
    console.error('Failed to fetch leads:', error.message)
    process.exit(1)
  }

  console.log(`Found ${leads.length} LLC leads to process`)
  if (DRY_RUN) {
    console.log('DRY RUN — not updating database')
    leads.slice(0, 5).forEach(l => console.log(' ', l.buyer_name))
    process.exit(0)
  }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  )

  let processed = 0
  let found = 0
  let failed = 0

  for (const lead of leads) {
    processed++
    const name = lead.buyer_name || ''

    process.stdout.write(`[${processed}/${leads.length}] ${name.substring(0, 50).padEnd(50)} `)

    try {
      const info = await searchSunbiz(page, name)

      if (info.memberName) {
        found++
        console.log(`=> ${info.memberName} (${info.memberCity || '?'}, ${info.memberState || '?'})`)

        // Update the lead in the database
        const { error: updateErr } = await supabase
          .from('leads')
          .update({
            member_name: info.memberName,
            member_address: info.memberAddress,
            member_city: info.memberCity,
            member_state: info.memberState,
            member_zip: info.memberZip,
            sunbiz_doc_number: info.sunbizDocNumber,
          })
          .eq('id', lead.id)

        if (updateErr) {
          console.error(`  DB update failed: ${updateErr.message}`)
        }
      } else {
        failed++
        console.log('=> NOT FOUND')
      }
    } catch (err) {
      failed++
      console.log(`=> ERROR: ${(err as Error).message}`)
    }

    // Rate limiting — 1.5 second delay between requests
    await new Promise(r => setTimeout(r, 1500))
  }

  await browser.close()

  console.log('\n' + '='.repeat(50))
  console.log(`Done! Processed: ${processed} | Found: ${found} | Not found: ${failed}`)
  console.log(`Success rate: ${((found / processed) * 100).toFixed(1)}%`)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
