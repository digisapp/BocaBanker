import { apiError } from '@/lib/api/response'
import { createChatStream, getMessageText } from '@/lib/api/chat-shared'
import { createGuestLeadCapture } from '@/lib/ai/tool-executors'
import { GUEST_SYSTEM_PROMPT, GUEST_SYSTEM_PROMPT_LEAD_CAPTURE } from '@/lib/ai/guest-system-prompt'
import { logger } from '@/lib/logger'
import { getGuestCount, createGuestCountCookie } from '@/lib/guest-chat/cookie'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const maxDuration = 60

const LEAD_CAPTURE_THRESHOLD = 3
const MAX_MESSAGE_ENTRIES = 50
/** Only the most recent turns go to the model — bounds per-request token cost. */
const MODEL_CONTEXT_MESSAGES = 20
/** Per-message cap (the widget input enforces the same limit). */
const MAX_MESSAGE_CHARS = 2000
/** Cap on the total history text a guest can make us send to the model. */
const MAX_TOTAL_CHARS = 30_000
/** Daily per-IP cap: bounds LLM spend from a single anonymous source. */
const DAILY_MESSAGES_PER_IP = 100

function tooManyRequests(resetTime: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))),
    },
  })
}

export async function POST(request: Request) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(`guest-chat:${ip}`, {
      maxRequests: 20,
      windowMs: 60_000,
    })
    if (!rateLimitResult.success) {
      return tooManyRequests(rateLimitResult.resetTime, 'Too many requests. Please try again shortly.')
    }

    const dailyResult = await rateLimit(`guest-chat-day:${ip}`, {
      maxRequests: DAILY_MESSAGES_PER_IP,
      windowMs: 24 * 60 * 60_000,
    })
    if (!dailyResult.success) {
      return tooManyRequests(
        dailyResult.resetTime,
        "You've reached today's guest chat limit. Sign up for free to keep chatting with Boca Banker."
      )
    }

    const count = getGuestCount(request)
    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGE_ENTRIES) {
      return apiError('Invalid messages', 400)
    }

    // Guests only ever author user/assistant text; drop anything else.
    const chatMessages = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-MODEL_CONTEXT_MESSAGES)

    let totalChars = 0
    for (const m of chatMessages) {
      const len = getMessageText(m).length
      if (m.role === 'user' && len > MAX_MESSAGE_CHARS) {
        return apiError(`Message is too long (max ${MAX_MESSAGE_CHARS} characters)`, 400)
      }
      totalChars += len
    }
    if (totalChars > MAX_TOTAL_CHARS) {
      return apiError('Conversation is too long. Sign up to continue this conversation.', 400)
    }

    // Use lead capture prompt on the 3rd message only, then revert to normal
    const basePrompt = count === LEAD_CAPTURE_THRESHOLD - 1
      ? GUEST_SYSTEM_PROMPT_LEAD_CAPTURE
      : GUEST_SYSTEM_PROMPT

    const result = await createChatStream({
      messages: chatMessages,
      systemPrompt: basePrompt,
      captureLeadExecutor: createGuestLeadCapture(ip),
      maxSearchResults: 3,
      searchSources: [{ type: 'web' }],
    })

    const newCount = count + 1
    const setCookieHeader = createGuestCountCookie(newCount)

    return result.toUIMessageStreamResponse({
      headers: {
        'Set-Cookie': setCookieHeader,
      },
      onError: (error) => {
        logger.error('chat-api', 'Guest chat stream error', error)
        return 'Something went wrong generating a response. Please try again.'
      },
    })
  } catch (error) {
    logger.error('chat-api', 'Guest chat API error', error)
    return apiError('Internal Server Error')
  }
}
