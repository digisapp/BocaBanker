import { streamText, stepCountIs, tool } from 'ai'
import { xai } from '@ai-sdk/xai'
import {
  calculateMortgage,
  captureLeadSchema,
  CAPTURE_LEAD_DESCRIPTION,
  scheduleConsultationSchema,
  SCHEDULE_CONSULTATION_DESCRIPTION,
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
 *
 * Request bodies are untrusted: only string text is returned, so an array
 * `content` (content parts, files, images) can't slip past the callers'
 * length caps and reach the model.
 */
export function getMessageText(msg: UIMessage): string {
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p?.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('')
  }
  return typeof msg.content === 'string' ? msg.content : ''
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

  // A consultation request is only useful if it reaches the owner, so it is
  // saved as a lead through the same executor as capture_lead.
  const scheduleConsultation = tool({
    description: SCHEDULE_CONSULTATION_DESCRIPTION,
    inputSchema: scheduleConsultationSchema,
    execute: async ({ clientName, clientEmail, clientPhone, topic, preferredTime }) => {
      if (!clientEmail && !clientPhone) {
        return {
          status: 'needs_contact',
          message: 'Not saved yet: ask for an email or phone number so Boca Banker can follow up.',
        }
      }
      const result = await captureLeadExecutor({
        buyerName: clientName,
        buyerEmail: clientEmail,
        buyerPhone: clientPhone,
        interestType: `Consultation request: ${topic}`,
        notes: preferredTime ? `Preferred time: ${preferredTime}` : undefined,
      })
      return result?.success
        ? {
            status: 'requested',
            message: `Consultation request saved for ${clientName} regarding "${topic}". Boca Banker will follow up.`,
          }
        : {
            status: 'failed',
            message: 'The request could not be saved. Ask them to use the contact form or call instead.',
          }
    },
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
