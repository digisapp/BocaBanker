import { z } from 'zod'
import { apiError } from '@/lib/api/response'
import { createGuestLeadCapture } from '@/lib/ai/tool-executors'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Contact form shown inside the homepage guest chat. Creates a lead in the
// owner's pipeline (same path as the AI's capture_lead tool) — visitors never
// get an account.

const schema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }).max(100),
  email: z.string().trim().email({ message: 'Enter a valid email' }).max(200),
  phone: z.string().trim().max(40).optional(),
  question: z.string().trim().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || 'Validation failed', 400)
    }
    const { name, email, phone, question } = parsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`guest-lead-form:${ip}`, { maxRequests: 5, windowMs: 60 * 60_000 })
    if (!rl.success) {
      return apiError('Too many requests. Please try again later.', 429)
    }

    const result = await createGuestLeadCapture(ip)({
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone || undefined,
      interestType: 'Homepage chat contact form',
      notes: question ? `Asked: "${question}"` : undefined,
    })

    if (!result.success) return apiError('Something went wrong. Please try again.', 500)
    return Response.json({ success: true })
  } catch (error) {
    logger.error('chat-api', 'Guest lead form error', error)
    return apiError('Internal Server Error')
  }
}
