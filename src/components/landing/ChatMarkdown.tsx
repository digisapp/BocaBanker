import { Fragment } from 'react'
import { parseChatMarkdown, type InlineSegment } from '@/lib/chat-markdown'

function Inline({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.bold ? (
          <strong key={i} className="font-semibold">
            {s.text}
          </strong>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        )
      )}
    </>
  )
}

export default function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2.5">
      {parseChatMarkdown(text).map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="font-semibold">
              <Inline segments={block.content} />
            </p>
          )
        }
        if (block.type === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              key={i}
              className={
                block.ordered ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5 marker:text-gray-400'
              }
            >
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline segments={item} />
                </li>
              ))}
            </List>
          )
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline segments={line} />
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
