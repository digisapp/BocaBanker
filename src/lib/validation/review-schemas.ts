import { z } from 'zod'

export const reviewSubmissionSchema = z.object({
  reviewer_name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  reviewer_email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  reviewer_city: z.string().max(100).optional().or(z.literal('')),
  reviewer_state: z.string().max(2).optional().or(z.literal('')),
  rating: z
    .number({ message: 'Rating is required' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  body: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review must be 5000 characters or less'),
  loan_type: z.string().max(50).optional().or(z.literal('')),
  loan_term: z.string().max(50).optional().or(z.literal('')),
  closed_on_time: z.boolean().optional(),
  is_first_time_buyer: z.boolean().optional(),
  is_self_employed: z.boolean().optional(),
})

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>

export const reviewAdminUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  response_text: z
    .string()
    .max(2000, 'Response must be 2000 characters or less')
    .optional()
    .or(z.literal('')),
})

export type ReviewAdminUpdateInput = z.infer<typeof reviewAdminUpdateSchema>
