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
vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        inserted.push(v)
        return {
          returning: async () => [{ id: 'row-1' }],
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        }
      },
    }),
  },
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const { sendEmail } = await import('./resend')

const THREAD = '0f3c6d2a-1b4e-4c8d-9e7f-0a1b2c3d4e5f'

beforeEach(() => {
  sendMock.mockReset()
  inserted.length = 0
  delete process.env.ADMIN_EMAIL_ADDRESS
  delete process.env.RESEND_FROM_EMAIL
  process.env.RESEND_API_KEY = 're_test'
})

describe('sendEmail', () => {
  it('sends with camelCase replyTo defaulting to the inbox, text + html, and logs the row', async () => {
    sendMock.mockResolvedValue({ data: { id: 're-123' }, error: null })

    const res = await sendEmail({ to: 'Jane@Example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi', userId: 'u1' })

    expect(res).toEqual({ success: true, resendId: 're-123', emailId: 'row-1' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const [payload, opts] = sendMock.mock.calls[0]
    expect(payload.from).toBe('Boca Banker <team@bocabanker.com>')
    expect(payload.replyTo).toBe('team@bocabanker.com')
    expect(payload).not.toHaveProperty('reply_to')
    expect(payload.text).toBe('Hi')
    expect(payload.headers).toBeUndefined()
    expect(opts).toBeUndefined()

    const row = inserted[0] as Record<string, unknown>
    expect(row.direction).toBe('outbound')
    expect(row.fromEmail).toBe('team@bocabanker.com')
    expect(row.fromName).toBe('Boca Banker')
    expect(row.replyTo).toBe('team@bocabanker.com')
    expect(row.status).toBe('sent')
    expect(row.resendId).toBe('re-123')
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
})
