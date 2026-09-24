import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }))

import { parseCSV } from './rates'

describe('parseCSV', () => {
  it('reads Freddie Mac PMMS history columns by header name', () => {
    const csv = [
      'date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread',
      '4/2/1971,7.33, ,,,,,,',
      '1/5/2023,6.48,0.8,5.73,0.8,5.52,0.3,,',
      '9/17/2026,6.95,,6.26,,,,,',
    ].join('\n')

    expect(parseCSV(csv)).toEqual([
      { weekOf: '1971-04-02', rate30yr: 7.33, rate15yr: null, rate5arm: null },
      { weekOf: '2023-01-05', rate30yr: 6.48, rate15yr: 5.73, rate5arm: 5.52 },
      { weekOf: '2026-09-17', rate30yr: 6.95, rate15yr: 6.26, rate5arm: null },
    ])
  })

  it('skips rows without a 30-year rate', () => {
    expect(parseCSV('date,pmms30,pmms15\n1/1/2020,,3.1\n')).toEqual([])
  })
})
