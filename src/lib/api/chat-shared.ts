import { streamText, stepCountIs, tool } from 'ai'
import { xai } from '@ai-sdk/xai'
import {
  calculateMortgage,
  captureLeadSchema,
  CAPTURE_LEAD_DESCRIPTION,
  scheduleConsultation,
} from '@/lib/ai/tools'
import { augmentPromptWithContext } from '@/lib/ai/xai-collections'

// ─── Types ──────────────────────────────────────────────────────────

interface UIMessage {
  role: string
  content?: string
  parts?: { type: string; text?: string }[]
}

export interface ChatStreamConfig {
  messages: UIMessage[]
  systemPrompt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureLeadExecutor: (input: any) => Promise<any>
  maxSearchResults?: number
  searchSources?: Array<{ type: string }>
  onFinish?: (result: { text: string }) => Promise<void>
}

// ─── Message helpers ────────────────────────────────────────────────

/**
 * Extract text content from a UIMessage (handles both parts-based and plain content).
 */
export function getMessageText(msg: UIMessage): string {
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text || '')
      .join('')
  }
  return msg.content || ''
}

/**
 * Convert an array of UIMessages to CoreMessages for the AI SDK.
 */
export function toCoreMessages(messages: UIMessage[]) {
  return messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: getMessageText(msg),
  }))
}

// ─── Stream builder ─────────────────────────────────────────────────

/**
 * Build and execute the streamText call with shared configuration.
 * Returns the streamText result — call .toUIMessageStreamResponse() on it.
 */
export async function createChatStream(config: ChatStreamConfig) {
  const {
    messages,
    systemPrompt: basePrompt,
    captureLeadExecutor,
    maxSearchResults = 5,
    searchSources = [{ type: 'web' }, { type: 'news' }],
    onFinish,
  } = config

  const coreMessages = toCoreMessages(messages)

  // RAG: augment with retrieved context (no-op if disabled)
  const lastUserContent =
    coreMessages.filter((m) => m.role === 'user').pop()?.content || ''
  const systemPrompt = await augmentPromptWithContext(basePrompt, lastUserContent)

  const captureLead = tool({
    description: CAPTURE_LEAD_DESCRIPTION,
    inputSchema: captureLeadSchema,
    execute: captureLeadExecutor,
  })

  return streamText({
    model: xai('grok-4-1-fast-non-reasoning'),
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      calculate_mortgage: calculateMortgage,
      capture_lead: captureLead,
      schedule_consultation: scheduleConsultation,
    },
    stopWhen: stepCountIs(5),
    providerOptions: {
      xai: {
        searchParameters: {
          mode: 'auto',
          returnCitations: true,
          maxSearchResults,
          sources: searchSources,
        },
      },
    },
    onFinish,
  })
}
