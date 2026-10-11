import { describe, it, expect, vi, beforeEach } from 'vitest'

// Each db.select(...)...limit() call resolves the next queued result
const results: unknown[][] = []
const send = vi.fn()
const resolveMx = vi.fn()

vi.mock('@/db', () => {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(results.shift() ?? []),
  }
  return { db: { select: () => chain } }
})
vi.mock('dns/promises', () => ({ resolveMx: (d: string) => resolveMx(d) }))
vi.mock('@/lib/email/resend', () => ({
  isResendConfigured: () => true,
  getResend: () => ({ emails: { send } }),
}))
vi.mock('@/lib/email/inbound-address', () => ({ getFrom: () => 'Boca Banker <team@bocabanker.com>' }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }))

const { sendNewLeadAlert } = await import('./lead-alerts')

const lead = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'owner-1',
  buyerName: 'Jane Doe',
  buyerPhone: '+15615550123',
  buyerEmail: null,
  propertyAddress: 'Not provided',
  propertyCity: null,
  propertyState: null,
  source: 'phone-call',
  notes: 'refinance — Wants to refinance a 7% loan.',
}

describe('sendNewLeadAlert', () => {
  beforeEach(() => {
    results.length = 0
    send.mockReset().mockResolvedValue({ error: null })
    resolveMx.mockReset().mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }])
  })

  it('emails the account address by default', async () => {
    results.push([lead], [], [{ email: 'owner@example.com' }])
    await sendNewLeadAlert(lead.id)
    expect(send).toHaveBeenCalledOnce()
    const msg = send.mock.calls[0][0]
    expect(msg.to).toBe('owner@example.com')
    expect(msg.subject).toBe('New lead: Jane Doe (phone call)')
    expect(msg.text).toContain('Phone: (561) 555-0123')
    // Placeholder addresses are not shown as a property
    expect(msg.text).not.toContain('Not provided')
    expect(msg.text).toContain(`/leads/${lead.id}`)
  })

  it('uses the alert address from settings', async () => {
    results.push([lead], [{ value: { enabled: true, email: 'phone@example.com' } }])
    await sendNewLeadAlert(lead.id)
    expect(send.mock.calls[0][0].to).toBe('phone@example.com')
  })

  it('sends nothing when alerts are off', async () => {
    results.push([lead], [{ value: { enabled: false, email: null } }])
    await sendNewLeadAlert(lead.id)
    expect(send).not.toHaveBeenCalled()
  })

  it('skips a domain with no mail server instead of bouncing', async () => {
    resolveMx.mockRejectedValue(Object.assign(new Error('no MX'), { code: 'ENODATA' }))
    results.push([lead], [], [{ email: 'owner@bocabanker.com' }])
    await sendNewLeadAlert(lead.id)
    expect(send).not.toHaveBeenCalled()
  })

  it('never throws', async () => {
    send.mockRejectedValue(new Error('Resend down'))
    results.push([lead], [], [{ email: 'owner@example.com' }])
    await expect(sendNewLeadAlert(lead.id)).resolves.toBeUndefined()
  })
})
