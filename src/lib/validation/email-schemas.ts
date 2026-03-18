import { z } from 'zod'

export const emailSchema = z.object({
  to_email: z
    .string()
    .min(1, 'Recipient email is required')
    .email('Please enter a valid email address'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be 200 characters or less'),
  body: z
    .string()
    .min(1, 'Email body is required')
    .max(10000, 'Email body must be 10,000 characters or less'),
  template: z.string().optional(),
})

export type EmailInput = z.infer<typeof emailSchema>
