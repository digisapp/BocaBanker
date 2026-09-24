/**
 * Minimal markdown parser for AI chat replies: paragraphs, bullet/numbered
 * lists, headings, and **bold**. Output is plain data rendered as React
 * elements — never HTML — so model output can't inject markup.
 */

export type InlineSegment = { text: string; bold: boolean }

export type ChatBlock =
  | { type: 'paragraph'; lines: InlineSegment[][] }
  | { type: 'heading'; content: InlineSegment[] }
  | { type: 'list'; ordered: boolean; items: InlineSegment[][] }

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^\s*#{1,6}\s+(.*)$/

export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  const re = /\*\*(.+?)\*\*|__(.+?)__/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), bold: false })
    segments.push({ text: match[1] ?? match[2], bold: true })
    last = re.lastIndex
  }
  if (last < text.length) segments.push({ text: text.slice(last), bold: false })
  return segments
}

export function parseChatMarkdown(text: string): ChatBlock[] {
  const blocks: ChatBlock[] = []
  let paragraph: InlineSegment[][] | null = null
  let list: Extract<ChatBlock, { type: 'list' }> | null = null

  const flush = () => {
    if (paragraph) blocks.push({ type: 'paragraph', lines: paragraph })
    if (list) blocks.push(list)
    paragraph = null
    list = null
  }

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      flush()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', content: parseInline(heading[1]) })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        flush()
        list = { type: 'list', ordered, items: [] }
      }
      list.items.push(parseInline((bullet ?? numbered)![1]))
      continue
    }

    if (list) flush()
    paragraph ??= []
    paragraph.push(parseInline(line.trim()))
  }

  flush()
  return blocks
}
