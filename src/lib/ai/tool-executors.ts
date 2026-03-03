import { z } from 'zod'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { captureLeadSchema } from './tools'

type CaptureLeadInput = z.infer<typeof captureLeadSchema>

/**
 * Create a lead capture executor for authenticated users.
 * Inserts into the leads table via Drizzle with the user's ID.
 */
export function createAuthLeadCapture(userId: string) {
  return async (input: CaptureLeadInput) => {
    try {
      const [created] = await db
        .insert(leads)
        .values({
          userId,
          propertyAddress: input.propertyAddress || 'Not provided',
          propertyCity: input.propertyCity || undefined,
          propertyState: input.propertyState || 'FL',
          propertyType: input.propertyType || 'other',
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail || undefined,
          buyerPhone: input.buyerPhone || undefined,
          salePrice: input.salePrice?.toString() ?? undefined,
          source: 'chat',
          notes:
            [input.interestType, input.notes].filter(Boolean).join(' — ') ||
            undefined,
          tags: ['chat-captured'],
          status: 'new',
          priority: 'medium',
        })
        .returning()

      return {
        success: true,
        leadId: created.id,
        message: `Lead captured for ${input.buyerName}. It's now in the leads dashboard.`,
      }
    } catch (error) {
      logger.error('tool-capture-lead', 'Failed to capture lead', error)
      return {
        success: false,
        message:
          'I noted the information but had trouble saving it. Please add it manually in the dashboard.',
      }
    }
  }
}

/**
 * Create a lead capture executor for guest users.
 * Uses supabaseAdmin (service role) since there is no authenticated user.
 */
export function createGuestLeadCapture() {
  return async (input: CaptureLeadInput) => {
    try {
      const { error } = await supabaseAdmin
        .from('leads')
        .insert({
          property_address: input.propertyAddress || 'Not provided',
          property_city: input.propertyCity || null,
          property_state: input.propertyState || 'FL',
          property_type: input.propertyType || 'other',
          buyer_name: input.buyerName,
          buyer_email: input.buyerEmail || null,
          buyer_phone: input.buyerPhone || null,
          sale_price: input.salePrice?.toString() ?? null,
          source: 'guest-chat',
          notes:
            [input.interestType, input.notes].filter(Boolean).join(' — ') ||
            null,
          tags: ['guest-chat-captured'],
          status: 'new',
          priority: 'medium',
        })

      if (error) throw error

      return {
        success: true,
        message: `Thank you, ${input.buyerName}! I've noted your information so we can provide a more personalized analysis.`,
      }
    } catch (error) {
      logger.error(
        'tool-guest-capture-lead',
        'Failed to capture guest lead',
        error
      )
      return {
        success: false,
        message: `Thanks for sharing that, ${input.buyerName}. I'll keep this in mind as we chat.`,
      }
    }
  }
}
