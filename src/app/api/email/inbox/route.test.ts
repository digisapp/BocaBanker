import { describe, it, expect, vi, beforeEach } from 'vitest'

// A malformed JSON body is the caller's mistake: 400, never the generic 500,
// and nothing reaches the service.

class ApiError extends Error {
  readonly response: Response
  constructor(message: string, status: number) {
    super(message)
    this.response = Response.json({ error: message }, { status })
  }
}
vi.mock('@/lib/api/auth', () => ({ ApiError, requireAdmin: async () => ({ id: 'u1', email: 'owner@example.com' }) }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: async () => ({ success: true }) }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
const bulk = vi.fn()
const sendNewEmail = vi.fn()
const setSetting = vi.fn()
vi.mock('@/lib/email/admin-inbox', () => ({
  AdminInboxService: { bulk, sendNewEmail, setSetting },
  isBulkAction: () => true,
  isInboxFolder: () => true,
  isInboxSettingKey: () => true,
}))

const inbox = await import('./route')
const settings = await import('./settings/route')

const malformed = (method: string) =>
  new Request('https://bocabanker.com/api/email/inbox', { method, body: '{"emailIds": [', headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  bulk.mockReset()
  sendNewEmail.mockReset()
  setSetting.mockReset()
})

describe('email inbox routes with a malformed JSON body', () => {
  it('answer 400 Invalid JSON body', async () => {
    for (const res of [
      await inbox.POST(malformed('POST') as never),
      await inbox.PUT(malformed('PUT') as never),
      await inbox.DELETE(malformed('DELETE') as never),
      await settings.PUT(malformed('PUT') as never),
    ]) {
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid JSON body' })
    }
    expect(bulk).not.toHaveBeenCalled()
    expect(sendNewEmail).not.toHaveBeenCalled()
    expect(setSetting).not.toHaveBeenCalled()
  })
})
