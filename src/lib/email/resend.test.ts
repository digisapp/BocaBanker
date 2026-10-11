import { describe, it, expect, vi, beforeEach } from 'vitest'

// sendEmail → Resend SDK contract. The SDK wants camelCase `replyTo`
// (a snake_case key is silently dropped), threading headers in `headers`,
// and the idempotency key as the second argument.

const sendMock = vi.fn()
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

const inserted: unknown[] = []
// Set to make every insert reject (e.g. migration 0011 not applied yet).
let insertError: Error | null = null
vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        if (insertError) {
          const fail = Promise.reject(insertError)
          fail.catch(() => {})
          return { returning: () => fail, then: fail.then.bind(fail) }
        }
        inserted.push(v)
        return {
          returning: async () => [{ id: 'row-1' }],
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        }
      },
    }),
  },
}))
const loggerError = vi.fn()
vi.mock('@/lib/logger', () => ({ logger: { error: (...a: unknown[]) => loggerError(...a), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const { sendEmail, RATE_LIMIT_RETRY_MS } = await import('./resend')

const THREAD = '0f3c6d2a-1b4e-4c8d-9e7f-0a1b2c3d4e5f'

beforeEach(() => {
  sendMock.mockReset()
  loggerError.mockReset()
  inserted.length = 0
  insertError = null
  vi.useRealTimers()
  delete process.env.ADMIN_EMAIL_ADDRESS
  delete process.env.RESEND_FROM_EMAIL
  process.env.RESEND_API_KEY = 're_test'
})

describe('sendEmail', () => {
  it('sends with camelCase replyTo defaulting to the inbox tagged with a new thread, text + html, and logs the row', async () => {
    sendMock.mockResolvedValue({ data: { id: 're-123' }, error: null })

    const res = await sendEmail({ to: 'Jane@Example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', userId: 'u1' })

    expect(res).toEqual({ success: true, resendId: 're-123', emailId: 'row-1' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const [payload, opts] = sendMock.mock.calls[0]
    const row = inserted[0] as Record<string, unknown>
    // A template / bulk / Arive-link send starts its own thread, and the
    // reply address carries it so the answer threads in /email.
    expect(row.threadId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(payload.from).toBe('Boca Banker <team@bocabanker.com>')
    expect(payload.replyTo).toBe(`team+${row.threadId}@bocabanker.com`)
    expect(payload).not.toHaveProperty('reply_to')
    expect(payload.text).toBe('Hi')
    expect(payload.headers).toBeUndefined()
    expect(opts).toBeUndefined()

    expect(row.direction).toBe('outbound')
    expect(row.fromEmail).toBe('team@bocabanker.com')
    expect(row.fromName).toBe('Boca Banker')
    expect(row.replyTo).toBe(payload.replyTo)
    expect(row.status).toBe('sent')
    expect(row.resendId).toBe('re-123')
  })

  it('keeps a given thread on the default reply address', async () => {
    sendMock.mockResolvedValue({ data: { id: 're-4' }, error: null })
    await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1', threadId: THREAD })
    expect(sendMock.mock.calls[0][0].replyTo).toBe(`team+${THREAD}@bocabanker.com`)
    expect((inserted[0] as Record<string, unknown>).threadId).toBe(THREAD)
  })

  it('passes a per-thread Reply-To, threading headers and the idempotency key through', async () => {
    sendMock.mockResolvedValue({ data: { id: 're-2' }, error: null })

    await sendEmail({
      to: 'jane@example.com',
      subject: 'Re: Hi',
      html: '<p>Reply</p>',
      userId: 'u1',
      threadId: THREAD,
      replyTo: `team+${THREAD}@bocabanker.com`,
      inReplyToMessageId: 'abc@mail.example.com',
      referencesMessageIds: ['<prev@mail.example.com>', 'abc@mail.example.com'],
      idempotencyKey: 'inbox-xyz',
      metadata: { test: true },
    })

    const [payload, opts] = sendMock.mock.calls[0]
    expect(payload.replyTo).toBe(`team+${THREAD}@bocabanker.com`)
    expect(payload.headers).toEqual({
      'In-Reply-To': '<abc@mail.example.com>',
      References: '<prev@mail.example.com> <abc@mail.example.com>',
    })
    expect(opts).toEqual({ idempotencyKey: 'inbox-xyz' })

    const row = inserted[0] as Record<string, unknown>
    expect(row.metadata).toEqual({ test: true, headers: payload.headers })
  })

  it('replyTo: null sends with no Reply-To at all', async () => {
    sendMock.mockResolvedValue({ data: { id: 're-3' }, error: null })
    await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: null, replyTo: null })
    expect(sendMock.mock.calls[0][0]).not.toHaveProperty('replyTo')
  })

  it('records a failed row and returns the SDK error', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'Domain not verified' } })
    const res = await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1' })
    expect(res.success).toBe(false)
    expect(res.error).toBe('Domain not verified')
    expect((inserted[0] as Record<string, unknown>).status).toBe('failed')
  })

  it('reports success once Resend accepted the mail, even when recording it fails', async () => {
    // e.g. the emails INSERT names is_spam/is_starred before migration 0011
    // is applied. Reporting failure here makes the user resend: a duplicate.
    sendMock.mockResolvedValue({ data: { id: 're-ok' }, error: null })
    insertError = new Error('column "is_spam" of relation "emails" does not exist')

    const res = await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1', idempotencyKey: 'k1' })

    expect(res).toEqual({ success: true, resendId: 're-ok', emailId: undefined })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(loggerError).toHaveBeenCalledTimes(1)
    expect(loggerError.mock.calls[0][1]).toMatch(/WAS SENT \(Resend id re-ok\)/)
    expect(loggerError.mock.calls[0][2]).toBe(insertError)
  })

  it('reports a thrown send as failed and still tries to record it', async () => {
    sendMock.mockRejectedValue(new Error('socket hang up'))
    const res = await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1' })
    expect(res).toEqual({ success: false, error: 'socket hang up' })
    expect((inserted[0] as Record<string, unknown>).status).toBe('failed')
  })

  describe('retryOnRateLimit', () => {
    const limited = { data: null, error: { name: 'rate_limit_exceeded', statusCode: 429, message: 'Too many requests' } }

    it('retries a rate-limited send once and records only the outcome', async () => {
      vi.useFakeTimers()
      sendMock.mockResolvedValueOnce(limited).mockResolvedValueOnce({ data: { id: 're-retry' }, error: null })

      const pending = sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1', retryOnRateLimit: true })
      await vi.advanceTimersByTimeAsync(RATE_LIMIT_RETRY_MS)
      const res = await pending

      expect(res).toMatchObject({ success: true, resendId: 're-retry' })
      expect(sendMock).toHaveBeenCalledTimes(2)
      // One emails row (+ one email_logs row), both "sent": no "failed" twin.
      expect(inserted).toHaveLength(2)
      expect(inserted.every((r) => (r as Record<string, unknown>).status === 'sent')).toBe(true)
      // The retry is the same message: same thread, same Reply-To.
      expect(sendMock.mock.calls[1][0]).toEqual(sendMock.mock.calls[0][0])
    })

    it('does not retry without the flag, nor a quota error with it', async () => {
      sendMock.mockResolvedValue(limited)
      const res = await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1' })
      expect(res.success).toBe(false)
      expect(sendMock).toHaveBeenCalledTimes(1)

      sendMock.mockReset()
      sendMock.mockResolvedValue({ data: null, error: { name: 'daily_quota_exceeded', statusCode: 429, message: 'Daily quota' } })
      const quota = await sendEmail({ to: 'jane@example.com', subject: 'x', html: '<p>x</p>', userId: 'u1', retryOnRateLimit: true })
      expect(quota).toMatchObject({ success: false, error: 'Daily quota' })
      expect(sendMock).toHaveBeenCalledTimes(1)
    })
  })
})
