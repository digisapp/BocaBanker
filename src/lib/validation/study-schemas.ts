import { z } from 'zod'

/**
 * IRC §168(d)(3) mid-quarter convention opt-in (5/7/15-year property uses
 * the quarterly tables). Shared by the create schema and the study PUT route.
 */
export const midQuarterConventionField = z.boolean({
  message: 'Mid-quarter convention must be true or false',
})

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
  // The tax year the property was placed in service (year 1 of the schedules)
  study_year: z
    .number({ message: 'Placed-in-service year is required' })
    .int('Placed-in-service year must be a whole number')
    .min(2000, 'Placed-in-service year must be 2000 or later')
    .max(2100, 'Placed-in-service year must be 2100 or earlier'),
  mid_quarter_convention: midQuarterConventionField.optional().default(false),
})

export type StudyInput = z.infer<typeof studySchema>
