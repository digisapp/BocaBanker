import { z } from 'zod'

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
