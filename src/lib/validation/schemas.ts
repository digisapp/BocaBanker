import { z } from 'zod'

// ──────────────────────────────────────────────
// Auth Schemas
// ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    full_name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be 100 characters or less'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type SignupInput = z.infer<typeof signupSchema>

// ──────────────────────────────────────────────
// Client Schema
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Property Schema
// ──────────────────────────────────────────────

export const propertySchema = z.object({
  address: z
    .string()
    .min(1, 'Address is required')
    .max(200, 'Address must be 200 characters or less'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be 100 characters or less'),
  state: z
    .string()
    .min(1, 'State is required')
    .max(2, 'Use 2-letter state abbreviation')
    .toUpperCase(),
  zip: z
    .string()
    .min(1, 'ZIP code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  property_type: z.enum(
    [
      'commercial',
      'residential',
      'mixed-use',
      'industrial',
      'retail',
      'hospitality',
      'healthcare',
      'multifamily',
    ],
    { message: 'Property type is required' }
  ),
  purchase_price: z
    .number({ message: 'Purchase price is required' })
    .positive('Purchase price must be positive'),
  purchase_date: z.string().optional().or(z.literal('')),
  building_value: z.number().positive('Building value must be positive').optional(),
  land_value: z.number().positive('Land value must be positive').optional(),
  square_footage: z
    .number()
    .int('Square footage must be a whole number')
    .positive('Square footage must be positive')
    .optional(),
  year_built: z
    .number()
    .int('Year must be a whole number')
    .min(1800, 'Year must be 1800 or later')
    .max(new Date().getFullYear(), 'Year cannot be in the future')
    .optional(),
  // Loan / Mortgage fields
  loan_amount: z.number().positive('Loan amount must be positive').optional(),
  interest_rate: z
    .number()
    .min(0, 'Interest rate must be 0 or greater')
    .max(30, 'Interest rate must be 30 or less')
    .optional(),
  loan_term_years: z
    .number()
    .int('Loan term must be a whole number')
    .min(1, 'Loan term must be at least 1 year')
    .max(40, 'Loan term must be 40 years or less')
    .optional(),
  monthly_payment: z.number().positive('Monthly payment must be positive').optional(),
  loan_type: z.string().max(50, 'Loan type must be 50 characters or less').optional().or(z.literal('')),
  lender_name: z.string().max(100, 'Lender name must be 100 characters or less').optional().or(z.literal('')),
  loan_origination_date: z.string().optional().or(z.literal('')),
})

export type PropertyInput = z.infer<typeof propertySchema>

// ──────────────────────────────────────────────
// Study Schema
// ──────────────────────────────────────────────

export const studySchema = z.object({
  study_name: z
    .string()
    .min(1, 'Study name is required')
    .max(200, 'Study name must be 200 characters or less'),
  property_id: z.string().uuid('Invalid property ID'),
  client_id: z.string().uuid('Invalid client ID'),
  tax_rate: z
    .number({ message: 'Tax rate is required' })
    .min(0, 'Tax rate must be 0 or greater')
    .max(100, 'Tax rate must be 100 or less'),
  discount_rate: z
    .number({ message: 'Discount rate is required' })
    .min(0, 'Discount rate must be 0 or greater')
    .max(100, 'Discount rate must be 100 or less'),
  bonus_depreciation_rate: z
    .number({ message: 'Bonus depreciation rate is required' })
    .min(0, 'Bonus depreciation rate must be 0 or greater')
    .max(100, 'Bonus depreciation rate must be 100 or less'),
  study_year: z
    .number({ message: 'Study year is required' })
    .int('Study year must be a whole number')
    .min(2000, 'Study year must be 2000 or later')
    .max(2100, 'Study year must be 2100 or earlier'),
})

export type StudyInput = z.infer<typeof studySchema>

// ──────────────────────────────────────────────
// Lead Schema
// ──────────────────────────────────────────────

export const leadSchema = z.object({
  property_address: z
    .string()
    .min(1, 'Property address is required')
    .max(300, 'Address must be 300 characters or less'),
  property_city: z.string().max(100).optional().or(z.literal('')),
  property_county: z.string().max(100).optional().or(z.literal('')),
  property_state: z.string().max(2).optional().or(z.literal('')),
  property_zip: z.string().max(10).optional().or(z.literal('')),
  property_type: z.enum(
    [
      'industrial',
      'office',
      'retail',
      'multifamily',
      'mixed-use',
      'hospitality',
      'healthcare',
      'other',
    ],
    { message: 'Property type is required' }
  ),
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

// ──────────────────────────────────────────────
// Loan Schema
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// User Settings Schema
// ──────────────────────────────────────────────

export const userSettingsSchema = z.object({
  arive_link: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  arive_company_name: z.string().max(100).optional().or(z.literal('')),
  rate_alert_enabled: z.boolean().optional(),
  rate_alert_threshold_bps: z.number().int().min(5).max(200).optional(),
})

export type UserSettingsInput = z.infer<typeof userSettingsSchema>

// ──────────────────────────────────────────────
// Review Submission Schema (public)
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Review Admin Update Schema
// ──────────────────────────────────────────────

export const reviewAdminUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  response_text: z
    .string()
    .max(2000, 'Response must be 2000 characters or less')
    .optional()
    .or(z.literal('')),
})

export type ReviewAdminUpdateInput = z.infer<typeof reviewAdminUpdateSchema>

// ──────────────────────────────────────────────
// Email Schema
// ──────────────────────────────────────────────

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
