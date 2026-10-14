import { describe, it, expect, vi, beforeEach } from 'vitest'

// Live DNS is mocked: what each MX answer (or resolver error) means for
// Resend receiving, and that a lookup never throws or hangs.

const resolveMx = vi.fn()
const resolveNs = vi.fn()
vi.mock('node:dns/promises', () => ({
  resolveMx: (...a: unknown[]) => resolveMx(...a),
  resolveNs: (...a: unknown[]) => resolveNs(...a),
}))

const { checkMx, classifyMx, dnsProviderName, isResendMxHost, lookupDnsProvider } = await import('./inbound-mx')

const dnsError = (code: string) => Object.assign(new Error(`query ${code} bocabanker.com`), { code })
const SES = 'inbound-smtp.us-east-1.amazonaws.com'

beforeEach(() => {
  resolveMx.mockReset()
  resolveNs.mockReset()
})

describe('isResendMxHost', () => {
  it('recognises Resend / SES inbound hosts, with or without the trailing dot', () => {
    expect(isResendMxHost(SES)).toBe(true)
    expect(isResendMxHost('Inbound-SMTP.eu-west-1.amazonaws.com.')).toBe(true)
    expect(isResendMxHost('mx.resend.com')).toBe(true)
    expect(isResendMxHost('mx.custom.example', 'mx.custom.example.')).toBe(true)
  })

  it('rejects everything else', () => {
    expect(isResendMxHost('smtp.google.com')).toBe(false)
    expect(isResendMxHost('aspmx.l.google.com')).toBe(false)
    expect(isResendMxHost('bocabanker-com.mail.protection.outlook.com')).toBe(false)
    expect(isResendMxHost('')).toBe(false)
  })
})

describe('classifyMx', () => {
  it('is resend when the most preferred MX is Resend', () => {
    expect(classifyMx([{ exchange: SES, priority: 10 }])).toEqual({ state: 'resend', records: [{ exchange: SES, priority: 10 }], preferred: SES, resendOutranked: false })
  })

  it('is other when mail goes elsewhere, and says so when that host outranks a Resend MX', () => {
    expect(classifyMx([{ exchange: 'smtp.google.com', priority: 1 }])).toMatchObject({ state: 'other', preferred: 'smtp.google.com', resendOutranked: false })
    const mixed = classifyMx([{ exchange: SES, priority: 10 }, { exchange: 'smtp.google.com', priority: 1 }])
    expect(mixed).toMatchObject({ state: 'other', preferred: 'smtp.google.com', resendOutranked: true })
    expect(mixed.records.map((r) => r.priority)).toEqual([1, 10])
  })

  it('a tie with a non-Resend host is other: that host gets part of the mail', () => {
    expect(classifyMx([{ exchange: SES, priority: 10 }, { exchange: 'mx.oldhost.net', priority: 10 }])).toMatchObject({ state: 'other', preferred: 'mx.oldhost.net' })
  })

  it('a Resend MX behind a higher priority number than another Resend MX is still resend', () => {
    expect(classifyMx([{ exchange: SES, priority: 10 }, { exchange: 'inbound-smtp.us-east-2.amazonaws.com', priority: 20 }]).state).toBe('resend')
  })

  it('no records, or a null MX (`0 .`), is none', () => {
    expect(classifyMx([]).state).toBe('none')
    expect(classifyMx([{ exchange: '', priority: 0 }])).toEqual({ state: 'none', records: [], preferred: null, resendOutranked: false })
  })
})

describe('checkMx', () => {
  it('looks up the inbound domain and classifies the answer', async () => {
    resolveMx.mockResolvedValue([{ exchange: SES, priority: 10 }])
    expect((await checkMx('bocabanker.com')).state).toBe('resend')
    expect(resolveMx).toHaveBeenCalledWith('bocabanker.com')
  })

  it('treats ENODATA (no MX) and ENOTFOUND (no such name) as no MX', async () => {
    resolveMx.mockRejectedValue(dnsError('ENODATA'))
    expect(await checkMx('bocabanker.com')).toEqual({ state: 'none', records: [], preferred: null, resendOutranked: false })
    resolveMx.mockRejectedValue(dnsError('ENOTFOUND'))
    expect((await checkMx('inbound.bocabanker.com')).state).toBe('none')
  })

  it('any other resolver error is unknown, not a throw', async () => {
    resolveMx.mockRejectedValue(dnsError('ESERVFAIL'))
    expect(await checkMx('bocabanker.com')).toMatchObject({ state: 'unknown', error: 'ESERVFAIL' })
  })

  it('times out quickly instead of hanging', async () => {
    resolveMx.mockReturnValue(new Promise(() => {}))
    const started = Date.now()
    const res = await checkMx('bocabanker.com', null, 20)
    expect(res).toMatchObject({ state: 'unknown' })
    expect(res.error).toMatch(/timed out/)
    expect(Date.now() - started).toBeLessThan(1000)
  })
})

describe('DNS host', () => {
  it('names the provider from the nameservers', () => {
    expect(dnsProviderName(['ns39.domaincontrol.com', 'ns40.domaincontrol.com'])).toBe('GoDaddy')
    expect(dnsProviderName(['ada.ns.cloudflare.com'])).toBe('Cloudflare')
    expect(dnsProviderName(['ns1.vercel-dns.com.'])).toBe('Vercel')
    expect(dnsProviderName(['ns-123.awsdns-15.com'])).toBe('Route 53')
    expect(dnsProviderName(['ns1.example.net'])).toBeNull()
  })

  it('is null when the lookup fails', async () => {
    resolveNs.mockResolvedValue(['ns39.domaincontrol.com'])
    expect(await lookupDnsProvider('bocabanker.com')).toBe('GoDaddy')
    resolveNs.mockRejectedValue(dnsError('ETIMEOUT'))
    expect(await lookupDnsProvider('bocabanker.com')).toBeNull()
  })
})
