import { z } from 'zod'
import { ApiError } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { readJson } from '@/lib/api/request'
import { sendNewLeadAlert } from '@/lib/lead-alerts'
import { logger } from '@/lib/logger'
import { requireVoiceAgent } from '@/lib/voice'

const schema = z.object({ leadId: z.string().uuid() })

/**
 * Called by the voice agent after it saves a new phone or website-voice lead,
 * so the owner gets the same new-lead email as for chat leads.
 */
export async function POST(request: Request) {
  try {
    requireVoiceAgent(request)
    const parsed = schema.safeParse(await readJson(request))
    if (!parsed.success) return apiError('leadId must be a lead id', 400)
    await sendNewLeadAlert(parsed.data.leadId)
    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) return error.response
    logger.error('voice', 'Failed to send a voice lead alert', error)
    return apiError('Internal Server Error')
  }
}
