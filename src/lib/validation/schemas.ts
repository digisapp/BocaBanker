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
