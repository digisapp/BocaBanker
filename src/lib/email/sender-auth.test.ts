import { describe, it, expect } from 'vitest'
import { dmarcVerdict } from './sender-auth'
import { autoReplySuppressionReason } from './inbound-address'

const ses = (verdict: string) => `amazonses.com; spf=pass smtp.mailfrom=example.com; dkim=none; dmarc=${verdict} header.from=example.com`
const forgedPass = 'amazonses.com; dmarc=pass header.from=example.com'

describe('dmarcVerdict', () => {
  it("reads the receiving server's single verdict", () => {
    expect(dmarcVerdict(ses('pass'))).toBe('pass')
    expect(dmarcVerdict(ses('none'))).toBe('none')
    expect(dmarcVerdict(ses('fail'))).toBe('fail')
    expect(dmarcVerdict(ses('temperror'))).toBe('unknown')
  })

  it('no trusted copy, or none at all, is unknown (current rules apply)', () => {
    expect(dmarcVerdict(null)).toBe('unknown')
    expect(dmarcVerdict('')).toBe('unknown')
    expect(dmarcVerdict('mx.attacker.test; dmarc=fail')).toBe('unknown')
    expect(dmarcVerdict('amazonses.com; spf=pass')).toBe('unknown')
  })

  it('a fail anywhere wins, in either order: a forged pass cannot cancel it', () => {
    expect(dmarcVerdict(`${ses('fail')} ${forgedPass}`)).toBe('fail')
    expect(dmarcVerdict(`${forgedPass} ${ses('fail')}`)).toBe('fail')
    expect(dmarcVerdict(`mx.relay.test; dmarc=pass ${ses('fail')}`)).toBe('fail')
  })

  it('two verdicts without a fail are ambiguous, never a pass', () => {
    expect(dmarcVerdict(`${ses('none')} ${forgedPass}`)).toBe('unknown')
    expect(dmarcVerdict(`${ses('pass')} ${forgedPass}`)).toBe('unknown')
  })
})

describe('auto-reply still needs an authenticated sender', () => {
  it('never answers a DMARC fail, none or unknown; answers a pass', () => {
    const from = 'jane@example.com'
    expect(autoReplySuppressionReason({ from, headers: { 'authentication-results': ses('fail') } })).toMatch(/not authenticated/)
    expect(autoReplySuppressionReason({ from, headers: { 'authentication-results': ses('none') } })).toMatch(/not authenticated/)
    expect(autoReplySuppressionReason({ from, headers: {} })).toMatch(/not authenticated/)
    expect(autoReplySuppressionReason({ from, headers: { 'authentication-results': ses('pass') } })).toBeNull()
  })
})
