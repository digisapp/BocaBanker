import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  automatedMailReason, autoReplySuppressionReason,
  decodeEncodedWords,
  findOurRecipient,
  getFrom,
  getFromAddress,
  getInboundAddress,
  getInboundDomain,
  isOurInboundAddress,
  parseEmailAddress,
  parseThreadIdFromAddresses,
  senderDisplayName,
  threadReplyAddress,
} from './inbound-address'

const THREAD = '0f3c6d2a-1b4e-4c8d-9e7f-0a1b2c3d4e5f'
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ['ADMIN_EMAIL_ADDRESS', 'RESEND_FROM_EMAIL']) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
})
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('addresses from env', () => {
  it('defaults From to team@bocabanker.com with the brand name', () => {
    expect(getFromAddress()).toBe('team@bocabanker.com')
    expect(getFrom()).toBe('Boca Banker <team@bocabanker.com>')
  })

  it('accepts a bare or a named RESEND_FROM_EMAIL', () => {
    process.env.RESEND_FROM_EMAIL = 'hello@bocabanker.com'
    expect(getFrom()).toBe('Boca Banker <hello@bocabanker.com>')
    process.env.RESEND_FROM_EMAIL = '"Nathan at Boca Banker" <nathan@bocabanker.com>'
    expect(getFrom()).toBe('Nathan at Boca Banker <nathan@bocabanker.com>')
  })

  it('inbox defaults to the From address and honours ADMIN_EMAIL_ADDRESS', () => {
    expect(getInboundAddress()).toBe('team@bocabanker.com')
    expect(getInboundDomain()).toBe('bocabanker.com')
    process.env.ADMIN_EMAIL_ADDRESS = ' "Inbox@Inbound.BocaBanker.com" '
    expect(getInboundAddress()).toBe('inbox@inbound.bocabanker.com')
    expect(getInboundDomain()).toBe('inbound.bocabanker.com')
  })

  it('ignores a malformed ADMIN_EMAIL_ADDRESS', () => {
    process.env.ADMIN_EMAIL_ADDRESS = 'not-an-address'
    expect(getInboundAddress()).toBe('team@bocabanker.com')
  })
})

describe('threadReplyAddress / parseThreadIdFromAddresses', () => {
  it('round-trips a thread id through the plus address', () => {
    const addr = threadReplyAddress(THREAD, 'team@bocabanker.com')
    expect(addr).toBe(`team+${THREAD}@bocabanker.com`)
    expect(parseThreadIdFromAddresses([`Boca Banker <${addr}>`], 'team@bocabanker.com')).toBe(THREAD)
  })

  it('finds the tag in any recipient and ignores other local parts / domains', () => {
    expect(parseThreadIdFromAddresses(['someone@example.com', `team+${THREAD}@bocabanker.com`], 'team@bocabanker.com')).toBe(THREAD)
    expect(parseThreadIdFromAddresses([`other+${THREAD}@bocabanker.com`], 'team@bocabanker.com')).toBeNull()
    expect(parseThreadIdFromAddresses([`team+${THREAD}@elsewhere.com`], 'team@bocabanker.com')).toBeNull()
    expect(parseThreadIdFromAddresses(['team+not-a-uuid@bocabanker.com'], 'team@bocabanker.com')).toBeNull()
  })

  it('falls back to the bare address for a non-UUID thread id', () => {
    expect(threadReplyAddress('legacy', 'team@bocabanker.com')).toBe('team@bocabanker.com')
  })
})

describe('parseEmailAddress / RFC 2047', () => {
  it('parses the usual From shapes', () => {
    expect(parseEmailAddress('"Jane Doe" <Jane@Example.com>')).toEqual({ name: 'Jane Doe', email: 'jane@example.com' })
    expect(parseEmailAddress('Jane <jane@example.com>')).toEqual({ name: 'Jane', email: 'jane@example.com' })
    expect(parseEmailAddress('<jane@example.com>')).toEqual({ name: null, email: 'jane@example.com' })
    expect(parseEmailAddress('jane@example.com')).toEqual({ name: null, email: 'jane@example.com' })
  })

  it('decodes encoded words in display names', () => {
    expect(decodeEncodedWords('=?UTF-8?B?Sm9zw6k=?= <jose@example.com>')).toBe('José <jose@example.com>')
    expect(decodeEncodedWords('=?utf-8?Q?Mar=C3=ADa_P=C3=A9rez?=')).toBe('María Pérez')
    expect(decodeEncodedWords('=?UTF-8?B?Sm9z?= =?UTF-8?B?w6k=?=')).toBe('José')
    expect(decodeEncodedWords('=?X-BOGUS?B?Sm9z?=')).toBe('=?X-BOGUS?B?Sm9z?=')
  })

  it('senderDisplayName prefers the raw header and strips junk', () => {
    expect(senderDisplayName('"  Jane \r\n Doe  " <jane@example.com>', 'jane@example.com')).toBe('Jane Doe')
    expect(senderDisplayName(undefined, 'Bob <bob@example.com>')).toBe('Bob')
    expect(senderDisplayName(undefined, 'bob@example.com')).toBeNull()
  })
})

describe('our domains', () => {
  it('accepts the inbound domain, the apex and any subdomain', () => {
    expect(isOurInboundAddress('team@bocabanker.com', 'inbox@inbound.bocabanker.com')).toBe(true)
    expect(isOurInboundAddress('x@inbound.bocabanker.com', 'inbox@inbound.bocabanker.com')).toBe(true)
    expect(isOurInboundAddress('x@mail.bocabanker.com', 'team@bocabanker.com')).toBe(true)
    expect(isOurInboundAddress('x@notbocabanker.com', 'team@bocabanker.com')).toBe(false)
    expect(isOurInboundAddress('x@digis.cc', 'team@bocabanker.com')).toBe(false)
  })

  it('findOurRecipient returns the first of ours, bare and lowercased', () => {
    expect(findOurRecipient(['Other <a@digis.cc>', 'Boca <Team@BocaBanker.com>'], 'team@bocabanker.com')).toBe('team@bocabanker.com')
    expect(findOurRecipient(['a@digis.cc'], 'team@bocabanker.com')).toBeNull()
  })
})

const PASS = { 'Authentication-Results': 'amazonses.com; spf=pass smtp.mailfrom=example.com; dkim=pass header.i=@example.com; dmarc=pass header.from=example.com' }

describe('autoReplySuppressionReason', () => {
  it('lets a normal human sender through once their address passed DMARC', () => {
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { ...PASS, 'auto-submitted': 'no' } })).toBeNull()
  })
  it('does not mistake an unauthenticated person for machine mail (they are still classified and shown)', () => {
    expect(automatedMailReason({ from: 'jane@example.com', headers: { 'auto-submitted': 'no' } })).toBeNull()
    expect(automatedMailReason({ from: 'jane@example.com', headers: { 'Auto-Submitted': 'auto-replied' } })).toMatch(/Auto-Submitted/)
  })
  it('never answers a sender whose From address is not proven (a reply would land on a third party)', () => {
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { 'auto-submitted': 'no' } })).toMatch(/not authenticated/)
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { 'Authentication-Results': 'amazonses.com; spf=pass; dmarc=none' } })).toMatch(/not authenticated/)
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { 'Authentication-Results': 'mx.attacker.test; dmarc=pass' } })).toMatch(/not authenticated/)
  })

  it('blocks our own domain, automated local parts and auto-responder headers', () => {
    expect(autoReplySuppressionReason({ from: 'team@bocabanker.com' })).toMatch(/own domain/)
    expect(autoReplySuppressionReason({ from: 'no-reply@bank.com' })).toMatch(/automated/)
    expect(autoReplySuppressionReason({ from: 'newsletter@shop.com' })).toMatch(/automated/)
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { ...PASS, 'Auto-Submitted': 'auto-replied' } })).toMatch(/Auto-Submitted/)
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { ...PASS, precedence: 'bulk' } })).toMatch(/Precedence/)
    expect(autoReplySuppressionReason({ from: 'jane@example.com', headers: { ...PASS, 'list-unsubscribe': '<mailto:x>' } })).toMatch(/list/)
    expect(autoReplySuppressionReason({ from: '' })).toMatch(/no sender/)
  })
})
