/** A validated import row and its 1-based position in the uploaded CSV data. */
export interface ImportRow<T> {
  row: number
  values: T
}

export interface ImportError {
  row: number
  message: string
}

/**
 * True when Postgres itself rejected the statement (a 5-character SQLSTATE
 * such as 22007 or 23505), so nothing was written and a retry can't
 * duplicate rows. Drizzle wraps driver errors, so check `cause` too.
 */
function rejectedByServer(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 3; depth++) {
    const code = (e as { code?: unknown }).code
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return true
    e = (e as { cause?: unknown }).cause
  }
  return false
}

/**
 * Insert rows in batches. A multi-row INSERT is all-or-nothing, so when
 * Postgres rejects a batch, retry it row by row: the good rows still land
 * and each failure names its real CSV row (not its position among the
 * valid rows). Other failures (e.g. connection loss) report the batch's rows.
 */
export async function insertInBatches<T>(
  rows: ImportRow<T>[],
  insert: (values: T[]) => Promise<unknown>,
  logError: (message: string, error: unknown) => void,
  batchSize = 100,
): Promise<{ imported: number; errors: ImportError[] }> {
  let imported = 0
  const errors: ImportError[] = []

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    try {
      await insert(batch.map((r) => r.values))
      imported += batch.length
      continue
    } catch (batchError) {
      const span = `rows ${batch[0].row}-${batch[batch.length - 1].row}`
      logError(`Failed to insert batch (CSV ${span})`, batchError)
      if (!rejectedByServer(batchError)) {
        errors.push({
          row: batch[0].row,
          message: `Failed to save ${batch.length} rows (CSV ${span}) — database error`,
        })
        continue
      }
    }

    for (const r of batch) {
      try {
        await insert([r.values])
        imported++
      } catch (rowError) {
        logError(`Failed to insert CSV row ${r.row}`, rowError)
        errors.push({ row: r.row, message: 'Could not be saved — check this row for invalid values' })
      }
    }
  }

  return { imported, errors }
}
