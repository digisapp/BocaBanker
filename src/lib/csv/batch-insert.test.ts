import { describe, it, expect } from 'vitest'
import { insertInBatches, type ImportRow } from './batch-insert'

// A Postgres rejection as Drizzle surfaces it: wrapper error, SQLSTATE on cause
function pgError(code: string) {
  return Object.assign(new Error('Failed query'), { cause: Object.assign(new Error('bad'), { code }) })
}

// CSV rows 2 and 4 failed validation earlier, so valid rows are 1, 3, 5, 6
const rows: ImportRow<string>[] = [1, 3, 5, 6].map((row) => ({ row, values: `v${row}` }))
const noop = () => {}

describe('insertInBatches', () => {
  it('inserts everything when batches succeed', async () => {
    const seen: string[][] = []
    const r = await insertInBatches(rows, async (v) => { seen.push(v) }, noop, 3)
    expect(r).toEqual({ imported: 4, errors: [] })
    expect(seen).toEqual([['v1', 'v3', 'v5'], ['v6']])
  })

  it('retries a rejected batch row by row and reports the real CSV row', async () => {
    const insert = async (v: string[]) => {
      if (v.includes('v5')) throw pgError('22008')
    }
    const r = await insertInBatches(rows, insert, noop, 3)
    expect(r.imported).toBe(3)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0].row).toBe(5)
  })

  it('does not retry (and risk duplicates) on non-Postgres failures', async () => {
    let calls = 0
    const insert = async () => {
      calls++
      throw Object.assign(new Error('closed'), { code: 'CONNECTION_CLOSED' })
    }
    const r = await insertInBatches(rows.slice(0, 3), insert, noop, 3)
    expect(calls).toBe(1)
    expect(r.imported).toBe(0)
    expect(r.errors).toEqual([{ row: 1, message: 'Failed to save 3 rows (CSV rows 1-5) — database error' }])
  })
})
