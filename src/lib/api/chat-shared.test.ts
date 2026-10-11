import { describe, it, expect } from 'vitest'
import { getMessageText, toCoreMessages } from './chat-shared'

describe('getMessageText', () => {
  it('joins text parts and ignores other parts', () => {
    expect(
      getMessageText({
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello ' },
          { type: 'file' },
          { type: 'text', text: 'there' },
        ],
      })
    ).toBe('Hello there')
  })

  it('returns plain string content', () => {
    expect(getMessageText({ role: 'user', content: 'Hi' })).toBe('Hi')
  })

  it('does not pass array content through (it would dodge the length caps)', () => {
    const msg = {
      role: 'user',
      content: [{ type: 'text', text: 'A'.repeat(100_000) }],
    } as unknown as Parameters<typeof getMessageText>[0]
    expect(getMessageText(msg)).toBe('')
    expect(toCoreMessages([msg])).toEqual([])
  })

  it('tolerates non-array parts instead of throwing', () => {
    const msg = { role: 'user', parts: 'x' } as unknown as Parameters<typeof getMessageText>[0]
    expect(getMessageText(msg)).toBe('')
  })
})
