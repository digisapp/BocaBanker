import { ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { businessToday } from '@/lib/dates'
import { claimDailyCounter } from '@/lib/rate-limit'
import { WEB_VOICE_CALLS_PER_DAY, WEB_VOICE_COUNTER, requireVoiceAgent } from '@/lib/voice'

/**
 * Called by the voice agent when a website voice call actually starts.
 * Counts it toward the day's cap; `allowed: false` means the cap is reached
 * and the agent should end the call politely.
 */
export async function POST(request: Request) {
  try {
    requireVoiceAgent(request)
    const allowed = await claimDailyCounter(WEB_VOICE_COUNTER, businessToday(), WEB_VOICE_CALLS_PER_DAY)
    if (!allowed) logger.warn('voice', 'Daily website voice call cap reached')
    return Response.json({ allowed })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('voice', 'Failed to claim a website voice call', error)
    return apiError('Internal Server Error')
  }
}
