#!/usr/bin/env npx tsx
import 'dotenv/config'
import postgres from 'postgres'

const DB_PASS = process.env.DATABASE_URL!.match(/:([^@]+)@/)?.[1] || ''
const ENCODED_PASS = encodeURIComponent(DB_PASS)
const POOLER_URL = `postgresql://app_user.fwepigxakjzlzqsfsmrf:${ENCODED_PASS}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
console.log('Password:', DB_PASS)
console.log('Encoded:', ENCODED_PASS)

console.log('Testing pooler connection...')

const sql = postgres(POOLER_URL, { prepare: false, max: 1 })

async function main() {
  const r = await sql`SELECT count(*) as c FROM leads`
  console.log('Leads via pooler:', r[0].c)
  await sql.end()
}

main().catch(e => {
  console.error('Failed:', e.message)
  process.exit(1)
})
