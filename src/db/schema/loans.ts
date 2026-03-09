import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { users } from './users'
import { leads } from './leads'

export const loans = pgTable('loans', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

  // Borrower info
  borrowerName: text('borrower_name').notNull(),
  borrowerEmail: text('borrower_email'),
  borrowerPhone: text('borrower_phone'),

  // Property
  propertyAddress: text('property_address').notNull(),
  propertyCity: text('property_city'),
  propertyState: text('property_state').default('FL'),
  propertyZip: text('property_zip'),

  // Loan details
  purchasePrice: numeric('purchase_price'),
  loanAmount: numeric('loan_amount').notNull(),
  loanType: text('loan_type', {
    enum: [
      'conventional',
      'fha',
      'va',
      'usda',
      'jumbo',
      'heloc',
      'commercial',
      'other',
    ],
  }).notNull(),
  interestRate: numeric('interest_rate'),
  term: integer('term'),

  // Pipeline status
  status: text('status', {
    enum: [
      'pre_qual',
      'application',
      'processing',
      'underwriting',
      'clear_to_close',
      'funded',
      'closed',
      'withdrawn',
    ],
  }).default('pre_qual'),

  // Arive integration
  ariveLink: text('arive_link'),
  ariveLinkSentAt: timestamp('arive_link_sent_at'),

  // Closing
  estimatedClosingDate: date('estimated_closing_date'),
  actualClosingDate: date('actual_closing_date'),

  // Commission tracking
  commissionBps: integer('commission_bps'),
  commissionAmount: numeric('commission_amount'),

  // Lender
  lenderId: text('lender_id'),
  lenderName: text('lender_name'),

  // Link to lead
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),

  // Notes
  notes: text('notes'),

  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
}, (table) => [
  index('loans_user_id_idx').on(table.userId),
  index('loans_lead_id_idx').on(table.leadId),
])

export const loansRelations = relations(loans, ({ one }) => ({
  user: one(users, { fields: [loans.userId], references: [users.id] }),
  lead: one(leads, { fields: [loans.leadId], references: [leads.id] }),
}))
