import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { getTableName, type SQL, type Table } from 'drizzle-orm'

// AdminInboxService against a fake db that renders every WHERE clause to SQL
// text (params inlined), so the tests check the conditions themselves:
// which rows a reply may thread onto, which rows get marked replied, what a
// delete touches.

const dialect = new PgDialect()
function render(cond: SQL | undefined): string {
  if (!cond) return ''
  const { sql, params } = dialect.sqlToQuery(cond)
  return sql.replace(/\$(\d+)/g, (_m, n: string) => `'${String(params[Number(n) - 1])}'`)
}

interface SelectQuery { table: string; where: string; cols: string[] }
let onSelect: (q: SelectQuery) => unknown[] = () => []
const selects: SelectQuery[] = []
const updates: { set: Record<string, unknown>; where: string }[] = []
const inserts: Record<string, unknown>[] = []
const deletes: string[] = []
let updateError: Error | null = null

function selectChain(cols: Record<string, unknown> | undefined) {
  const state: { table?: Table; where?: SQL } = {}
  const chain = {
    from: (t: Table) => { state.table = t; return chain },
    leftJoin: () => chain,
    where: (w: SQL) => { state.where = w; return chain },
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
      try {
        const q = { table: state.table ? getTableName(state.table) : '', where: render(state.where), cols: Object.keys(cols || {}) }
        selects.push(q)
        resolve(onSelect(q))
      } catch (e) {
        reject(e)
      }
    },
  }
  return chain
}

const fakeDb = {
  select: (cols?: Record<string, unknown>) => selectChain(cols),
  update: () => ({
    set: (set: Record<string, unknown>) => ({
      where: async (w: SQL) => {
        if (updateError) throw updateError
        updates.push({ set, where: render(w) })
      },
    }),
  }),
  insert: () => ({
    values: (v: Record<string, unknown>) => {
      const returning = async () => {
        inserts.push(v)
        return [{ ...v, id: 'new-row', createdAt: new Date() }]
      }
      return { onConflictDoNothing: () => ({ returning }), returning }
    },
  }),
  delete: () => ({ where: async (w: SQL) => { deletes.push(render(w)) } }),
  transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeDb),
}

vi.mock('@/db', () => ({ db: fakeDb }))
vi.mock('./default-owner', () => ({ getDefaultOwnerId: async () => 'owner-1' }))
const sendEmail = vi.fn()
vi.mock('./resend', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const { AdminInboxService, isLikelySpam } = await import('./admin-inbox')

const THREAD = '0f3c6d2a-1b4e-4c8d-9e7f-0a1b2c3d4e5f'
const inThreadSql = `("emails"."id" = '${THREAD}' or "emails"."thread_id" = '${THREAD}')`

beforeEach(() => {
  onSelect = () => []
  selects.length = 0
  updates.length = 0
  inserts.length = 0
  deletes.length = 0
  updateError = null
  sendEmail.mockReset()
  delete process.env.ADMIN_EMAIL_ADDRESS
  delete process.env.RESEND_FROM_EMAIL
})

describe('isLikelySpam', () => {
  it('leaves ordinary mortgage mail alone', () => {
    expect(isLikelySpam({ from: 'jane@example.com', subject: 'Wire transfer instructions for closing', text: 'The rate lock is only good for a limited time.' })).toBe(false)
    expect(isLikelySpam({ from: 'jane@example.com', subject: 'Refinancing an inherited property', text: 'Limited time to close on the inheritance.' })).toBe(false)
    expect(isLikelySpam({ from: 'ops@lender.loan', subject: 'Conditions cleared', text: 'Clear to close.' })).toBe(false)
  })

  it('still catches plain spam', () => {
    expect(isLikelySpam({ from: 'x@example.com', subject: 'Congratulations you won the lottery', text: 'Act now!' })).toBe(true)
    expect(isLikelySpam({ from: 'x@cheap.xyz', subject: 'hello', text: '' })).toBe(true)
    expect(isLikelySpam({ from: 'newsletter@shop.com', subject: 'hello', text: '' })).toBe(true)
  })
})

describe('markReplied', () => {
  it('only marks inbound mail replied, never our own outbound row', async () => {
    await AdminInboxService.markReplied('row-1')
    expect(updates).toHaveLength(1)
    expect(updates[0].set.status).toBe('replied')
    expect(updates[0].where).toBe(`("emails"."id" = 'row-1' and "emails"."direction" = 'inbound')`)
  })

  it('a follow-up to our own outbound email sends and does not mark it replied', async () => {
    onSelect = (q) => (q.table === 'emails' && q.where === `"emails"."id" = 'out-1'`
      ? [{ id: 'out-1', direction: 'outbound', threadId: THREAD, clientId: null, metadata: {}, subject: 'Your quote', bodyText: 'hi', bodyHtml: null, fromEmail: 'team@bocabanker.com', fromName: 'Boca Banker', createdAt: new Date() }]
      : [])
    sendEmail.mockResolvedValue({ success: true, resendId: 're-1', emailId: 'out-2' })

    const res = await AdminInboxService.sendNewEmail({ to: 'jane@example.com', subject: 'Following up', bodyText: 'Any news?', replyToEmailId: 'out-1', userId: 'u1' })

    expect(res).toMatchObject({ success: true, threadId: THREAD })
    expect(updates.every((u) => u.where.includes(`"emails"."direction" = 'inbound'`))).toBe(true)
  })

  it('reports a delivered reply as sent even if marking the original fails', async () => {
    onSelect = (q) => (q.where === `"emails"."id" = 'in-1'`
      ? [{ id: 'in-1', direction: 'inbound', threadId: THREAD, clientId: null, metadata: {}, subject: 'Q', bodyText: 'q', bodyHtml: null, fromEmail: 'jane@example.com', fromName: null, createdAt: new Date() }]
      : [])
    sendEmail.mockResolvedValue({ success: true, resendId: 're-1', emailId: 'out-2' })
    updateError = new Error('column "is_spam" does not exist')

    const res = await AdminInboxService.sendNewEmail({ to: 'jane@example.com', subject: 'Re: Q', bodyText: 'A', replyToEmailId: 'in-1', userId: 'u1' })
    expect(res.success).toBe(true)
  })
})

describe('delete', () => {
  it('keeps the rest of the thread together (thread_id is not cleared)', async () => {
    await AdminInboxService.bulk('delete', [THREAD])
    expect(updates.some((u) => 'threadId' in u.set)).toBe(false)
    expect(updates).toEqual([{ set: { inReplyToId: null }, where: `"emails"."in_reply_to_id" in ('${THREAD}')` }])
    expect(deletes).toEqual([`"emails"."id" in ('${THREAD}')`])
  })
})

describe('storeInboundEmail threading', () => {
  const base = { to: 'team@bocabanker.com', text: 'Thanks', html: null }

  it('never threads mail "from" our own address, even with a tag and a Re: subject', async () => {
    onSelect = (q) => {
      if (q.table !== 'emails') return []
      if (q.where === inThreadSql && q.cols.includes('userId')) return [{ id: 'out-1', threadId: THREAD, userId: 'u1' }]
      if (q.where === inThreadSql) return [{ direction: 'outbound', fromEmail: 'team@bocabanker.com', toEmail: 'team@bocabanker.com' }]
      if (q.where.includes('ilike')) return [{ id: 'out-1', threadId: THREAD, userId: 'u1' }]
      return []
    }

    const stored = await AdminInboxService.storeInboundEmail({ ...base, from: 'team@bocabanker.com', subject: 'Re: Your rate quote', threadIdHint: THREAD })

    expect(stored).not.toBeNull()
    expect(selects.some((q) => q.table === 'emails' && q.where.includes('ilike'))).toBe(false)
    expect(inserts[0].threadId).not.toBe(THREAD)
    expect(inserts[0].inReplyToId).toBeNull()
    expect(updates.some((u) => u.set.status === 'replied')).toBe(false)
  })

  it('subject fallback matches only rows whose counterpart is the sender, case-insensitively', async () => {
    onSelect = (q) => (q.table === 'emails' && q.where.includes('ilike') ? [{ id: 'out-1', threadId: THREAD, userId: 'u1' }] : [])

    await AdminInboxService.storeInboundEmail({ ...base, from: 'john.smith@gmail.com', subject: 'Re: Your rate quote' })

    const subjectQuery = selects.find((q) => q.table === 'emails' && q.where.includes('ilike'))!.where
    expect(subjectQuery).toContain(`("emails"."direction" = 'outbound' and lower("emails"."to_email") = 'john.smith@gmail.com')`)
    expect(subjectQuery).toContain(`("emails"."direction" = 'inbound' and lower("emails"."from_email") = 'john.smith@gmail.com')`)
    expect(inserts[0]).toMatchObject({ threadId: THREAD, inReplyToId: 'out-1', userId: 'u1', isSpam: false })
    expect(updates).toContainEqual(expect.objectContaining({ where: `("emails"."id" = 'out-1' and "emails"."direction" = 'outbound')` }))
  })

  it("a tagged reply from the thread's counterpart stays in its thread and out of Spam", async () => {
    onSelect = (q) => {
      if (q.table !== 'emails') return []
      if (q.where === inThreadSql && q.cols.includes('userId')) return [{ id: 'out-1', threadId: THREAD, userId: 'u1' }]
      // Stored as typed; the sender arrives lower-cased.
      if (q.where === inThreadSql) return [{ direction: 'outbound', fromEmail: 'team@bocabanker.com', toEmail: 'Jane@Example.com' }]
      return []
    }
    const spammy = 'Is the rate a limited time offer? No obligation either way.'

    await AdminInboxService.storeInboundEmail({ ...base, from: 'jane@example.com', subject: 'Re: Your rate quote', text: spammy, threadIdHint: THREAD })
    expect(inserts[0]).toMatchObject({ threadId: THREAD, inReplyToId: 'out-1', userId: 'u1', isSpam: false })

    // The same words with no proven thread are still filtered.
    inserts.length = 0
    onSelect = () => []
    await AdminInboxService.storeInboundEmail({ ...base, from: 'jane@example.com', subject: 'Rates', text: spammy })
    expect(inserts[0]).toMatchObject({ isSpam: true })
  })

  it('a tag used by someone other than the counterpart does not join the thread', async () => {
    onSelect = (q) => {
      if (q.table !== 'emails') return []
      if (q.where === inThreadSql && q.cols.includes('userId')) return [{ id: 'out-1', threadId: THREAD, userId: 'u1' }]
      if (q.where === inThreadSql) return [{ direction: 'outbound', fromEmail: 'team@bocabanker.com', toEmail: 'jane@example.com' }]
      return []
    }
    await AdminInboxService.storeInboundEmail({ ...base, from: 'mallory@example.com', subject: 'Hello', threadIdHint: THREAD })
    expect(inserts[0].threadId).not.toBe(THREAD)
    expect(inserts[0].userId).toBe('owner-1')
  })
})

describe('storeInboundEmail with a DMARC verdict', () => {
  const base = { to: 'team@bocabanker.com', text: 'Thanks', html: null }
  // Every way into the thread answers: the tag, In-Reply-To and the Re: subject.
  const threadExists = (q: SelectQuery) => {
    if (q.table === 'clients') return [{ id: 'client-1', userId: 'u1' }]
    if (q.table !== 'emails') return []
    if (q.cols.includes('userId')) return [{ id: 'out-1', threadId: THREAD, userId: 'u1' }]
    if (q.where === inThreadSql) return [{ direction: 'outbound', fromEmail: 'team@bocabanker.com', toEmail: 'jane@example.com' }]
    return []
  }
  const reply = { ...base, from: 'jane@example.com', subject: 'Re: Your rate quote', threadIdHint: THREAD, inReplyToHeader: '<m1@bocabanker.com>' }

  it("a DMARC fail from the counterpart's address joins no thread, links no client, and is flagged", async () => {
    onSelect = threadExists

    await AdminInboxService.storeInboundEmail({ ...reply, dmarc: 'fail' })

    expect(inserts[0].threadId).not.toBe(THREAD)
    expect(inserts[0]).toMatchObject({ inReplyToId: null, clientId: null, userId: 'owner-1', metadata: { dmarc: 'fail' } })
    expect(selects.some((q) => q.table === 'clients')).toBe(false)
    expect(selects.some((q) => q.table === 'emails' && q.where.includes('ilike'))).toBe(false)
    expect(updates.some((u) => u.set.status === 'replied')).toBe(false)
  })

  it('pass, none (no DMARC policy) and unknown thread exactly as before', async () => {
    for (const dmarc of ['pass', 'none', 'unknown', undefined] as const) {
      inserts.length = 0
      onSelect = threadExists
      await AdminInboxService.storeInboundEmail({ ...reply, dmarc })
      expect(inserts[0]).toMatchObject({ threadId: THREAD, inReplyToId: 'out-1', clientId: 'client-1', userId: 'u1' })
      expect((inserts[0].metadata as { dmarc?: string }).dmarc).toBe(dmarc)
    }
  })

  it('the list marks a DMARC-failed row as an unverified sender', async () => {
    onSelect = (q) => (q.cols.includes('value')
      ? [{ value: 2 }]
      : [
        { id: 'a', bodyText: 'hi', bodyHtml: null, metadata: { dmarc: 'fail' } },
        { id: 'b', bodyText: 'hi', bodyHtml: null, metadata: { dmarc: 'none' } },
      ])
    const { emails } = await AdminInboxService.listEmails({})
    expect(emails.map((e) => [e.id, e.unverifiedSender])).toEqual([['a', true], ['b', false]])
  })
})
