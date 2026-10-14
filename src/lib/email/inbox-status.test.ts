import { describe, it, expect, vi, beforeEach } from 'vitest'

// The readiness check against a mocked Resend account and mocked DNS: each
// way receiving can be broken gets its own fix line, in fix order, and the
// check never throws.

const resolveMx = vi.fn()
const resolveNs = vi.fn()
vi.mock('node:dns/promises', () => ({
  resolveMx: (...a: unknown[]) => resolveMx(...a),
  resolveNs: (...a: unknown[]) => resolveNs(...a),
}))

const domainsList = vi.fn()
const domainsGet = vi.fn()
const webhooksList = vi.fn()
let configured = true
vi.mock('./resend', () => ({
  getResend: () => ({ domains: { list: domainsList, get: domainsGet }, webhooks: { list: webhooksList } }),
  isResendConfigured: () => configured,
}))

const { getInboxStatus, pickWebhook, CANONICAL_WEBHOOK_URL } = await import('./inbox-status')

const SES = 'inbound-smtp.us-east-1.amazonaws.com'
const noData = Object.assign(new Error('queryMx ENODATA bocabanker.com'), { code: 'ENODATA' })
const OTHER_BUSINESS_HOOK = { id: 'wh_other', endpoint: 'https://digis.cc/api/webhooks/resend', status: 'enabled', events: ['email.received'], created_at: '' }
const OUR_HOOK = { id: 'wh_bb', endpoint: CANONICAL_WEBHOOK_URL, status: 'enabled', events: ['email.received', 'email.delivered', 'email.bounced', 'email.failed'], created_at: '' }

function domain(receiving: 'enabled' | 'disabled') {
  const summary = { id: 'dom_1', name: 'bocabanker.com', status: 'verified', region: 'us-east-1', created_at: '', capabilities: { sending: 'enabled', receiving } }
  const records = [
    { record: 'DKIM', name: 'resend._domainkey', type: 'TXT', value: 'p=MIGf', ttl: 'Auto', status: 'verified' },
    ...(receiving === 'enabled' ? [{ record: 'Receiving', name: 'bocabanker.com', type: 'MX', value: SES, ttl: 'Auto', status: 'verified', priority: 10 }] : []),
  ]
  domainsList.mockResolvedValue({ data: { object: 'list', has_more: false, data: [summary] }, error: null })
  domainsGet.mockResolvedValue({ data: { ...summary, object: 'domain', records }, error: null })
}

function hooks(...data: unknown[]) {
  webhooksList.mockResolvedValue({ data: { object: 'list', has_more: false, data }, error: null })
}

beforeEach(() => {
  for (const m of [resolveMx, resolveNs, domainsList, domainsGet, webhooksList]) m.mockReset()
  configured = true
  resolveNs.mockResolvedValue(['ns39.domaincontrol.com', 'ns40.domaincontrol.com'])
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_x'
  process.env.XAI_API_KEY = 'xai_x'
  delete process.env.ADMIN_EMAIL_ADDRESS
  delete process.env.RESEND_FROM_EMAIL
})

describe('getInboxStatus', () => {
  it('production on 2026-10-11: receiving off, no MX, no webhook, no secret — one fix line each, in order', async () => {
    domain('disabled')
    resolveMx.mockRejectedValue(noData)
    hooks(OTHER_BUSINESS_HOOK)
    delete process.env.RESEND_WEBHOOK_SECRET

    const s = await getInboxStatus({ fresh: true })

    expect(s.ready).toBe(false)
    expect(s.dnsHost).toBe('GoDaddy')
    expect(s.domain).toMatchObject({ found: true, receiving: 'disabled' })
    expect(s.mx).toMatchObject({ state: 'none', expected: { host: '@', value: SES, priority: 10 } })
    expect(s.webhook.found).toBe(false)
    expect(s.problems).toEqual([
      'Receiving is disabled for bocabanker.com in Resend. In Resend → Domains → bocabanker.com, enable Receiving.',
      `bocabanker.com has no MX record, so mail to it never arrives. At GoDaddy, add the MX record Resend shows (host @, value ${SES}, priority 10).`,
      `No Resend webhook sends mail to ${CANONICAL_WEBHOOK_URL}. In Resend → Webhooks, add it with email.received, email.delivered, email.bounced and email.failed.`,
      "RESEND_WEBHOOK_SECRET is not set, so every webhook call is rejected. Set it in Vercel (Production) to the webhook's signing secret, then redeploy.",
    ])
    expect(s.domain.records.find((r) => r.record === 'Receiving')).toMatchObject({ host: '@', value: SES, status: 'missing' })
  })

  it('is ready once receiving, MX, webhook and secret are all in place', async () => {
    domain('enabled')
    resolveMx.mockResolvedValue([{ exchange: SES, priority: 10 }])
    hooks(OTHER_BUSINESS_HOOK, OUR_HOOK)

    const s = await getInboxStatus({ fresh: true })
    expect(s.problems).toEqual([])
    expect(s.ready).toBe(true)
    expect(s.webhook).toMatchObject({ found: true, canonical: true, hasReceivedEvent: true })
  })

  it('MX added before receiving is enabled: the record shows as pending, only the Resend switch is left', async () => {
    domain('disabled')
    resolveMx.mockResolvedValue([{ exchange: SES, priority: 10 }])
    hooks(OUR_HOOK)

    const s = await getInboxStatus({ fresh: true })
    expect(s.problems).toEqual(['Receiving is disabled for bocabanker.com in Resend. In Resend → Domains → bocabanker.com, enable Receiving.'])
    expect(s.domain.records.find((r) => r.record === 'Receiving')?.status).toBe('pending')
  })

  it('names the host that gets the mail when the MX points elsewhere', async () => {
    domain('enabled')
    resolveMx.mockResolvedValue([{ exchange: 'smtp.google.com', priority: 1 }, { exchange: SES, priority: 10 }])
    hooks(OUR_HOOK)

    const s = await getInboxStatus({ fresh: true })
    expect(s.ready).toBe(false)
    expect(s.problems).toEqual([
      `bocabanker.com's MX sends mail to smtp.google.com, which outranks the Resend MX. At GoDaddy, replace it with the MX record Resend shows (host @, value ${SES}, priority 10).`,
    ])
  })

  it('flags a webhook without email.received, and finds ours past the first page', async () => {
    domain('enabled')
    resolveMx.mockResolvedValue([{ exchange: SES, priority: 10 }])
    webhooksList
      .mockResolvedValueOnce({ data: { object: 'list', has_more: true, data: [OTHER_BUSINESS_HOOK] }, error: null })
      .mockResolvedValueOnce({ data: { object: 'list', has_more: false, data: [{ ...OUR_HOOK, events: ['email.delivered'] }] }, error: null })

    const s = await getInboxStatus({ fresh: true })
    expect(webhooksList).toHaveBeenNthCalledWith(2, { limit: 100, after: 'wh_other' })
    expect(s.webhook).toMatchObject({ found: true, hasReceivedEvent: false })
    expect(s.problems).toEqual(['The Resend webhook does not send email.received, so no mail arrives. Add that event in Resend → Webhooks.'])
  })

  it('a failed MX lookup is reported but does not mark a working inbox broken', async () => {
    domain('enabled')
    resolveMx.mockRejectedValue(Object.assign(new Error('x'), { code: 'ESERVFAIL' }))
    resolveNs.mockRejectedValue(new Error('down'))
    hooks(OUR_HOOK)

    const s = await getInboxStatus({ fresh: true })
    expect(s.ready).toBe(true)
    expect(s.dnsHost).toBeNull()
    expect(s.problems).toEqual(['Could not look up the MX record for bocabanker.com (ESERVFAIL). Re-check in a minute.'])
  })

  it('still checks DNS and the secret without RESEND_API_KEY, and never throws when Resend does', async () => {
    configured = false
    resolveMx.mockRejectedValue(noData)
    delete process.env.RESEND_WEBHOOK_SECRET
    const noKey = await getInboxStatus({ fresh: true })
    expect(domainsList).not.toHaveBeenCalled()
    expect(noKey.problems[0]).toMatch(/RESEND_API_KEY is not set/)
    expect(noKey.problems.some((p) => p.includes('has no MX record'))).toBe(true)
    expect(noKey.problems.some((p) => p.startsWith('RESEND_WEBHOOK_SECRET'))).toBe(true)

    configured = true
    domainsList.mockRejectedValue(new Error('network down'))
    hooks()
    const broken = await getInboxStatus({ fresh: true })
    expect(broken.error).toBe('network down')
    expect(broken.problems[0]).toBe('Could not read Resend configuration: network down')
    expect(broken.ready).toBe(false)
  })
})

describe('pickWebhook', () => {
  it('prefers the exact apex URL with email.received over other bocabanker endpoints', () => {
    const www = { ...OUR_HOOK, id: 'wh_www', endpoint: 'https://www.bocabanker.com/api/email/webhook' }
    expect(pickWebhook([www, OTHER_BUSINESS_HOOK, OUR_HOOK])).toBe(OUR_HOOK)
    expect(pickWebhook([OTHER_BUSINESS_HOOK, www])).toBe(www)
    expect(pickWebhook([OTHER_BUSINESS_HOOK])).toBeNull()
  })
})
