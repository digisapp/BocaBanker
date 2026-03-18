import { z } from 'zod'

export const loanSchema = z.object({
  borrower_name: z
    .string()
    .min(1, 'Borrower name is required')
    .max(200, 'Name must be 200 characters or less'),
  borrower_email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  borrower_phone: z
    .string()
    .max(20, 'Phone must be 20 characters or less')
    .optional()
    .or(z.literal('')),
  property_address: z
    .string()
    .min(1, 'Property address is required')
    .max(300, 'Address must be 300 characters or less'),
  property_city: z.string().max(100).optional().or(z.literal('')),
  property_state: z.string().max(2).optional().or(z.literal('')),
  property_zip: z.string().max(10).optional().or(z.literal('')),
  purchase_price: z.number().positive('Purchase price must be positive').optional(),
  loan_amount: z
    .number({ message: 'Loan amount is required' })
    .positive('Loan amount must be positive'),
  loan_type: z.enum(
    ['conventional', 'fha', 'va', 'usda', 'jumbo', 'heloc', 'commercial', 'other'],
    { message: 'Loan type is required' }
  ),
  interest_rate: z
    .number()
    .min(0, 'Rate must be 0 or greater')
    .max(30, 'Rate must be 30 or less')
    .optional(),
  term: z
    .number()
    .int('Term must be a whole number')
    .min(1, 'Term must be at least 1 year')
    .max(40, 'Term must be 40 years or less')
    .optional(),
  status: z
    .enum([
      'pre_qual',
      'application',
      'processing',
      'underwriting',
      'clear_to_close',
      'funded',
      'closed',
      'withdrawn',
    ])
    .default('pre_qual'),
  arive_link: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  estimated_closing_date: z.string().optional().or(z.literal('')),
  actual_closing_date: z.string().optional().or(z.literal('')),
  commission_bps: z.number().int().min(0).max(500).optional(),
  lender_name: z.string().max(100).optional().or(z.literal('')),
  lead_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(5000).optional().or(z.literal('')),
})

export type LoanInput = z.infer<typeof loanSchema>
