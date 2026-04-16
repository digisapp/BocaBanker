import { apiError } from '@/lib/api/response'
import { createChatStream } from '@/lib/api/chat-shared'
import { createGuestLeadCapture } from '@/lib/ai/tool-executors'
import { GUEST_SYSTEM_PROMPT, GUEST_SYSTEM_PROMPT_LEAD_CAPTURE } from '@/lib/ai/guest-system-prompt'
import { logger } from '@/lib/logger'
import { getGuestCount, createGuestCountCookie } from '@/lib/guest-chat/cookie'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const LEAD_CAPTURE_THRESHOLD = 3
const MAX_MESSAGE_ENTRIES = 50

export async function POST(request: Request) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = getClientIp(request)
    const rateLimitResult = await rateLimit(`guest-chat:${ip}`, {
      maxRequests: 20,
      windowMs: 60_000,
    })

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again shortly.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          },
        }
      )
    }

    const count = getGuestCount(request)
    const { messages } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGE_ENTRIES) {
      return apiError('Invalid messages', 400)
    }

    // Use lead capture prompt on the 3rd message only, then revert to normal
    const basePrompt = count === LEAD_CAPTURE_THRESHOLD - 1
      ? GUEST_SYSTEM_PROMPT_LEAD_CAPTURE
      : GUEST_SYSTEM_PROMPT

    const result = await createChatStream({
      messages,
      systemPrompt: basePrompt,
      captureLeadExecutor: createGuestLeadCapture(),
      maxSearchResults: 3,
      searchSources: [{ type: 'web' }],
    })

    const newCount = count + 1
    const setCookieHeader = createGuestCountCookie(newCount)

    return result.toUIMessageStreamResponse({
      headers: {
        'Set-Cookie': setCookieHeader,
      },
    })
  } catch (error) {
    logger.error('chat-api', 'Guest chat API error', error)
    return apiError('Internal Server Error')
  }
}
