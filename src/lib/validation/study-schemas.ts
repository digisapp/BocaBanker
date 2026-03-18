import { z } from 'zod'

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
