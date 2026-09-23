import { z } from 'zod'
import { LEAD_PROPERTY_TYPES } from '@/constants/property-types'

/**
 * Schemas for partial (PUT) updates. Unlike the create schemas these accept
 * `null` to clear optional columns and numeric strings (drizzle returns
 * numeric columns as strings, and the edit UIs echo them back verbatim).
 * Every key is optional; routes must only write keys present in the input.
 */

const numericString = (opts: { min?: number; max?: number } = {}) =>
  z
    .union([z.number(), z.string().trim().regex(/^-?\d+(\.\d+)?$/, 'Must be a number')])
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n), 'Must be a number')
    .refine((n) => opts.min === undefined || n >= opts.min, `Must be at least ${opts.min}`)
    .refine((n) => opts.max === undefined || n <= opts.max, `Must be at most ${opts.max}`)
    .transform((n) => n.toString())

const intValue = (min: number, max: number) =>
  z
    .union([z.number(), z.string().trim().regex(/^-?\d+$/, 'Must be a whole number')])
    .transform((v) => Number(v))
    .pipe(z.number().int().min(min).max(max))

const optionalText = (max: number) => z.string().max(max).nullable()

/** YYYY-MM-DD, or empty string / null to clear. */
const dateOrNull = z
  .union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').refine((v) => !isNaN(Date.parse(v)), 'Invalid date'),
    z.literal(''),
  ])
  .nullable()
  .transform((v) => (v ? v : null))

const emailOrNull = z
  .union([z.string().trim().email('Invalid email'), z.literal('')])
  .nullable()
  .transform((v) => (v ? v : null))

const httpsUrlOrNull = z
  .union([
    z.string().trim().url('Invalid URL').refine((v) => /^https?:\/\//i.test(v), 'URL must be http(s)'),
    z.literal(''),
  ])
  .nullable()
  .transform((v) => (v ? v : null))

const tagsInput = z
  .union([z.string(), z.array(z.string().max(100)).max(100)])
  .nullable()
  .transform((v) =>
    !v ? [] : typeof v === 'string' ? v.split(',').map((t) => t.trim()).filter(Boolean) : v,
  )

// Limits here are deliberately looser than leadSchema: CSV imports and ATTOM
// scrapes insert leads without those limits, and the edit UI re-sends
// existing values — a strict limit would make such leads un-editable.
const looseEmailOrNull = z
  .union([z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'), z.literal('')])
  .nullable()
  .transform((v) => (v ? v : null))

export const leadUpdateSchema = z.object({
  property_address: z.string().trim().min(1).max(1000),
  property_city: optionalText(200),
  property_county: optionalText(200),
  property_state: optionalText(50),
  property_zip: optionalText(20),
  property_type: z.enum(LEAD_PROPERTY_TYPES),
  sale_price: numericString({ min: 0 }).nullable(),
  sale_date: dateOrNull,
  parcel_id: optionalText(200),
  buyer_name: optionalText(500),
  buyer_company: optionalText(500),
  buyer_email: looseEmailOrNull,
  buyer_phone: optionalText(50),
  seller_name: optionalText(500),
  square_footage: intValue(0, 2_000_000_000).nullable(),
  year_built: intValue(1000, 2100).nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost']),
  priority: z.enum(['low', 'medium', 'high']),
  source: optionalText(200),
  notes: optionalText(20_000),
  tags: tagsInput,
}).partial()

export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>

export const loanUpdateSchema = z.object({
  borrower_name: z.string().trim().min(1).max(200),
  borrower_email: emailOrNull,
  borrower_phone: optionalText(20),
  property_address: z.string().trim().min(1).max(300),
  property_city: optionalText(100),
  property_state: optionalText(2),
  property_zip: optionalText(10),
  purchase_price: numericString({ min: 0 }).nullable(),
  loan_amount: numericString({ min: 0 }),
  loan_type: z.enum(['conventional', 'fha', 'va', 'usda', 'jumbo', 'heloc', 'commercial', 'other']),
  interest_rate: numericString({ min: 0, max: 30 }).nullable(),
  term: intValue(1, 40).nullable(),
  status: z.enum([
    'pre_qual',
    'application',
    'processing',
    'underwriting',
    'clear_to_close',
    'funded',
    'closed',
    'withdrawn',
  ]),
  arive_link: httpsUrlOrNull,
  estimated_closing_date: dateOrNull,
  actual_closing_date: dateOrNull,
  commission_bps: intValue(0, 500).nullable(),
  lender_name: optionalText(100),
  lead_id: z.union([z.string().uuid(), z.literal('')]).nullable().transform((v) => (v ? v : null)),
  notes: optionalText(5000),
}).partial()

export type LoanUpdateInput = z.infer<typeof loanUpdateSchema>

export const studyUpdateSchema = z.object({
  study_name: z.string().trim().min(1).max(200),
  tax_rate: numericString({ min: 0, max: 100 }),
  discount_rate: numericString({ min: 0, max: 100 }),
  bonus_depreciation_rate: numericString({ min: 0, max: 100 }),
  study_year: intValue(2000, 2100),
  status: z.enum(['draft', 'in_progress', 'completed']),
  notes: z.string().max(10_000).nullable(),
}).partial()

export const studyAssetInputSchema = z.object({
  category: z.enum([
    'personal_property_5yr',
    'personal_property_7yr',
    'land_improvements_15yr',
    'building_27_5yr',
    'building_39yr',
    'land',
  ]),
  description: z.string().max(300).optional().nullable(),
  amount: z.union([z.number(), z.string().trim().regex(/^\d+(\.\d+)?$/)]).transform(Number).pipe(z.number().nonnegative().finite()),
  recoveryPeriod: z.union([z.literal(0), z.literal(5), z.literal(7), z.literal(15), z.literal(27.5), z.literal(39)]),
  bonusEligible: z.boolean().optional().default(true),
})

export const userSettingsUpdateSchema = z.object({
  ariveLink: httpsUrlOrNull.optional(),
  ariveCompanyName: z.string().max(200).nullable().optional(),
  rateAlertEnabled: z.boolean().optional(),
  rateAlertThresholdBps: intValue(0, 10_000).nullable().optional(),
})

export const documentCreateSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().max(200).nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  storagePath: z.string().min(1).max(1024),
  clientId: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
  studyId: z.union([z.string().uuid(), z.literal('')]).nullable().optional(),
})
