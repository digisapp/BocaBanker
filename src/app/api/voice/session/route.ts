import { AccessToken, RoomAgentDispatch, RoomConfiguration, TrackSource } from 'livekit-server-sdk'
import { apiError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/** Must match AGENT_NAME in voice-agent/agent.py (the phone agent also takes website calls). */
const VOICE_AGENT_NAME = 'boca-banker-phone'

// Each call can run up to 10 minutes of paid xAI + LiveKit time, and anyone can
// start one without signing up, so these bound the worst-case daily spend.
const CALLS_PER_MINUTE_PER_IP = 3
const CALLS_PER_DAY_PER_IP = 6
const CALLS_PER_DAY_TOTAL = 150
const DAY_MS = 24 * 60 * 60_000

function tooManyRequests(resetTime: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))),
    },
  })
}

/**
 * Starts a website voice call: returns a LiveKit token for a fresh room that
 * dispatches the Boca Banker voice agent into it.
 */
export async function POST(request: Request) {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return apiError("Voice chat isn't available right now. Please type your question instead.", 503)
  }

  try {
    const ip = getClientIp(request)
    const minute = await rateLimit(`voice-call:${ip}`, { maxRequests: CALLS_PER_MINUTE_PER_IP, windowMs: 60_000 })
    if (!minute.success) {
      return tooManyRequests(minute.resetTime, 'Too many calls in a row. Please wait a minute and try again.')
    }
    const daily = await rateLimit(`voice-call-day:${ip}`, { maxRequests: CALLS_PER_DAY_PER_IP, windowMs: DAY_MS })
    if (!daily.success) {
      return tooManyRequests(
        daily.resetTime,
        "You've reached today's voice chat limit. You can keep asking by text, or come back tomorrow."
      )
    }
    const total = await rateLimit('voice-call-day:all', { maxRequests: CALLS_PER_DAY_TOTAL, windowMs: DAY_MS })
    if (!total.success) {
      logger.warn('voice', 'Daily website voice call cap reached')
      return tooManyRequests(total.resetTime, "Voice chat is busy right now. Please type your question instead.")
    }

    const id = crypto.randomUUID()
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `visitor-${id.slice(0, 8)}`,
      name: 'Website visitor',
      // Only needs to last until the visitor joins
      ttl: '5m',
    })
    token.addGrant({
      room: `web-${id}`,
      roomJoin: true,
      canPublish: true,
      canPublishSources: [TrackSource.MICROPHONE],
      canSubscribe: true,
      canPublishData: true,
    })
    token.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({ agentName: VOICE_AGENT_NAME, metadata: JSON.stringify({ channel: 'web' }) }),
      ],
    })

    return Response.json({ serverUrl: LIVEKIT_URL, token: await token.toJwt() })
  } catch (error) {
    logger.error('voice', 'Failed to start website voice call', error)
    return apiError("Couldn't start the call. Please try again, or type your question instead.")
  }
}
