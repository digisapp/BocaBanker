import { describe, it, expect } from 'vitest'
import { parseChatMarkdown, parseInline } from './chat-markdown'

describe('parseInline', () => {
  it('splits bold segments', () => {
    expect(parseInline('Rates are **6.5%** today')).toEqual([
      { text: 'Rates are ', bold: false },
      { text: '6.5%', bold: true },
      { text: ' today', bold: false },
    ])
  })

  it('leaves unmatched asterisks as text', () => {
    expect(parseInline('a ** b')).toEqual([{ text: 'a ** b', bold: false }])
  })
})

describe('parseChatMarkdown', () => {
  it('groups paragraphs and lists', () => {
    const blocks = parseChatMarkdown('Key things:\n- Rate\n- **Term**\n\nThen:\n1. Apply\n2. Close')
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'paragraph', 'list'])
    expect(blocks[1]).toEqual({
      type: 'list',
      ordered: false,
      items: [[{ text: 'Rate', bold: false }], [{ text: 'Term', bold: true }]],
    })
    expect(blocks[3]).toMatchObject({ type: 'list', ordered: true })
  })

  it('ends a list when a plain line follows', () => {
    const blocks = parseChatMarkdown('- one\nafter')
    expect(blocks.map((b) => b.type)).toEqual(['list', 'paragraph'])
  })

  it('starts a new list when switching between bullets and numbers', () => {
    const blocks = parseChatMarkdown('- a\n1. b')
    expect(blocks).toHaveLength(2)
  })

  it('parses headings', () => {
    expect(parseChatMarkdown('### Your options')).toEqual([
      { type: 'heading', content: [{ text: 'Your options', bold: false }] },
    ])
  })

  it('keeps consecutive lines in one paragraph', () => {
    const [block] = parseChatMarkdown('line one\nline two')
    expect(block).toMatchObject({ type: 'paragraph' })
    expect(block.type === 'paragraph' && block.lines).toHaveLength(2)
  })
})
