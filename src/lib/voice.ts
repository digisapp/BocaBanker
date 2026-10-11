import { timingSafeEqual } from 'crypto'
import { ApiError } from '@/lib/api/auth'

/**
 * Website voice calls allowed per day (New York time), site-wide. Each call
 * can run up to 10 minutes of paid xAI + LiveKit time. The voice agent counts
 * a call when it actually starts (POST /api/voice/claim), so requesting
 * tokens without calling can't use up the day's calls.
 */
export const WEB_VOICE_CALLS_PER_DAY = 150
export const WEB_VOICE_COUNTER = 'web-voice-calls'

/**
 * Authenticate a call from the voice agent (voice-agent/agent.py). It already
 * holds the Supabase service-role key, so it presents that as a bearer token
 * rather than needing another shared secret.
 */
export function requireVoiceAgent(request: Request): void {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !token) throw new ApiError('Unauthorized', 401)
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ApiError('Unauthorized', 401)
  }
}
