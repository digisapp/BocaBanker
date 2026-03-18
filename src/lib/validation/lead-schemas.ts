import { z } from 'zod'
import { LEAD_PROPERTY_TYPES } from '@/constants/property-types'

export const leadSchema = z.object({
  property_address: z
    .string()
    .min(1, 'Property address is required')
    .max(300, 'Address must be 300 characters or less'),
  property_city: z.string().max(100).optional().or(z.literal('')),
  property_county: z.string().max(100).optional().or(z.literal('')),
  property_state: z.string().max(2).optional().or(z.literal('')),
  property_zip: z.string().max(10).optional().or(z.literal('')),
  property_type: z.enum(LEAD_PROPERTY_TYPES, {
    message: 'Property type is required',
  }),
  sale_price: z.number().positive('Sale price must be positive').optional(),
  sale_date: z.string().optional().or(z.literal('')),
  parcel_id: z.string().max(50).optional().or(z.literal('')),
  buyer_name: z.string().max(200).optional().or(z.literal('')),
  buyer_company: z.string().max(200).optional().or(z.literal('')),
  buyer_email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  buyer_phone: z.string().max(20).optional().or(z.literal('')),
  seller_name: z.string().max(200).optional().or(z.literal('')),
  square_footage: z.number().int().positive().optional(),
  year_built: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  status: z
    .enum(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'])
    .default('new'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  source: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
})

export type LeadInput = z.infer<typeof leadSchema>
