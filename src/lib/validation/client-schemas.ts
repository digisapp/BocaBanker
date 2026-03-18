import { z } from 'zod'

export const clientSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less'),
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Phone number must be 20 characters or less')
    .optional()
    .or(z.literal('')),
  company: z
    .string()
    .max(100, 'Company name must be 100 characters or less')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(200, 'Address must be 200 characters or less')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .max(100, 'City must be 100 characters or less')
    .optional()
    .or(z.literal('')),
  state: z
    .string()
    .max(2, 'Use 2-letter state abbreviation')
    .optional()
    .or(z.literal('')),
  zip: z
    .string()
    .max(10, 'ZIP code must be 10 characters or less')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'prospect', 'inactive'], {
    message: 'Status is required',
  }),
  tags: z.string().optional().or(z.literal('')),
  notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or less')
    .optional()
    .or(z.literal('')),
  source: z
    .string()
    .max(100, 'Source must be 100 characters or less')
    .optional()
    .or(z.literal('')),
})

export type ClientInput = z.infer<typeof clientSchema>
