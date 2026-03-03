import { tool } from 'ai'
import { z } from 'zod'

// ─── Mortgage Calculator Tool ───────────────────────────────────────

export const calculateMortgage = tool({
  description:
    'Calculate monthly mortgage payment, total interest, and amortization summary. ' +
    'Use this when a user asks about mortgage payments, affordability, or wants to compare loan scenarios.',
  inputSchema: z.object({
    loanAmount: z.number().describe('The loan principal amount in dollars'),
    annualRate: z
      .number()
      .describe('The annual interest rate as a percentage (e.g., 6.5 for 6.5%)'),
    termYears: z.number().describe('The loan term in years (e.g., 30, 15)'),
    downPayment: z
      .number()
      .optional()
      .describe('Down payment amount in dollars, if applicable'),
    propertyTax: z
      .number()
      .optional()
      .describe('Annual property tax in dollars'),
    insurance: z
      .number()
      .optional()
      .describe('Annual homeowners insurance in dollars'),
  }),
  execute: async ({
    loanAmount,
    annualRate,
    termYears,
    downPayment,
    propertyTax,
    insurance,
  }) => {
    const principal = downPayment ? loanAmount - downPayment : loanAmount
    const monthlyRate = annualRate / 100 / 12
    const numPayments = termYears * 12

    const monthlyPI =
      monthlyRate === 0
        ? principal / numPayments
        : (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)

    const monthlyTax = (propertyTax ?? 0) / 12
    const monthlyInsurance = (insurance ?? 0) / 12
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance
    const totalInterest = monthlyPI * numPayments - principal
    const totalCost = monthlyPI * numPayments

    return {
      principal: Math.round(principal),
      monthlyPI: Math.round(monthlyPI * 100) / 100,
      monthlyTotal: Math.round(totalMonthly * 100) / 100,
      totalInterest: Math.round(totalInterest),
      totalCost: Math.round(totalCost),
      termYears,
      annualRate,
      monthlyTax: Math.round(monthlyTax * 100) / 100,
      monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    }
  },
})

// ─── Capture Lead Schema (execute injected per-route) ───────────────

export const captureLeadSchema = z.object({
  buyerName: z.string().describe('The prospective client name'),
  buyerEmail: z
    .string()
    .email()
    .optional()
    .describe('Email address if provided'),
  buyerPhone: z.string().optional().describe('Phone number if provided'),
  propertyAddress: z
    .string()
    .optional()
    .describe('Property street address if provided'),
  propertyCity: z.string().optional().describe('City of the property'),
  propertyState: z
    .string()
    .optional()
    .describe('State abbreviation (e.g., FL)'),
  propertyType: z
    .enum([
      'industrial',
      'office',
      'retail',
      'multifamily',
      'mixed-use',
      'hospitality',
      'healthcare',
      'other',
    ])
    .optional()
    .describe('Type of property'),
  salePrice: z
    .number()
    .optional()
    .describe('Property value or sale price if mentioned'),
  interestType: z
    .string()
    .optional()
    .describe('Type of interest (e.g., refinance, purchase, cost seg)'),
  notes: z
    .string()
    .optional()
    .describe('Brief summary of what the client is looking for'),
})

export const CAPTURE_LEAD_DESCRIPTION =
  'Save lead information when a user has shared their name, contact info, and/or property details. ' +
  'Call this when you have gathered enough info to create a lead record. ' +
  'You should have at minimum a name and either an email, phone number, or property location.'

// ─── Schedule Consultation Tool ─────────────────────────────────────

export const scheduleConsultation = tool({
  description:
    'Offer to schedule a consultation when a client expresses interest in a detailed analysis, ' +
    'meeting, or follow-up. Returns a confirmation that the request was noted.',
  inputSchema: z.object({
    clientName: z.string().describe('Name of the client'),
    clientEmail: z
      .string()
      .email()
      .optional()
      .describe('Email for sending calendar invite'),
    topic: z
      .string()
      .describe(
        'What the consultation is about (e.g., "cost segregation study for warehouse", "refinance options")'
      ),
    preferredTime: z
      .string()
      .optional()
      .describe('Any time preference mentioned by the client'),
  }),
  execute: async ({ clientName, topic, preferredTime }) => {
    return {
      status: 'noted',
      message: `Consultation request noted for ${clientName} regarding "${topic}".${preferredTime ? ` Preferred time: ${preferredTime}.` : ''} The team will follow up.`,
    }
  },
})
