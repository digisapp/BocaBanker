import { streamText, stepCountIs, tool } from 'ai'
import { xai } from '@ai-sdk/xai'
import {
  calculateMortgage,
  captureLeadSchema,
  CAPTURE_LEAD_DESCRIPTION,
  scheduleConsultation,
} from '@/lib/ai/tools'
import { augmentPromptWithContext } from '@/lib/ai/xai-collections'
import type { XaiResponsesProviderOptions } from '@ai-sdk/xai'
import { CHAT_MODEL, REASONING_EFFORT } from '@/lib/ai/models'

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
  onFinish?: (result: { text: string; steps: Array<{ text: string }> }) => Promise<void>
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
  return messages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: getMessageText(msg),
    }))
    .filter((msg) => msg.content.length > 0)
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
    // Responses API: xAI retired Live Search (searchParameters returns 410);
    // web search is now a server-side agent tool.
    model: xai.responses(CHAT_MODEL),
    providerOptions: {
      xai: { reasoningEffort: REASONING_EFFORT } satisfies XaiResponsesProviderOptions,
    },
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      web_search: xai.tools.webSearch(),
      calculate_mortgage: calculateMortgage,
      capture_lead: captureLead,
      schedule_consultation: scheduleConsultation,
    },
    stopWhen: stepCountIs(5),
    onFinish,
  })
}
