import { describe, it, expect, vi } from 'vitest'

vi.mock('@/db', () => ({ db: {} }))
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }))

const { autoReplySafetyIssue, htmlToText } = await import('./ai-email')

describe('autoReplySafetyIssue', () => {
  it('allows a normal draft with our own link and address', () => {
    expect(
      autoReplySafetyIssue(
        'Hi John,\n\nThanks for reaching out. Learn more at https://bocabanker.com. Or email team@bocabanker.com.\n\nThe Boca Banker Team'
      )
    ).toBeNull()
  })

  it('blocks external links injected via the inbound email', () => {
    expect(autoReplySafetyIssue('Please verify at https://evil.example.com/login')).toMatch(/external link/)
    expect(autoReplySafetyIssue('Go to www.phish.net now')).toMatch(/external/)
    expect(autoReplySafetyIssue('Visit paypal-secure.com to confirm')).toMatch(/external domain/)
  })

  it('blocks empty and oversized drafts', () => {
    expect(autoReplySafetyIssue('   ')).toBe('empty draft')
    expect(autoReplySafetyIssue('a'.repeat(5000))).toBe('draft too long')
  })
})

describe('htmlToText', () => {
  it('drops style/script content and tags', () => {
    expect(
      htmlToText('<style>p{color:red}</style><p>Hello&nbsp;there</p><script>alert(1)</script><p>Bye</p>')
    ).toBe('Hello there\nBye')
  })
})
