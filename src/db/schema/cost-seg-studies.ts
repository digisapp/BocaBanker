import { pgTable, uuid, text, timestamp, numeric, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';
import { properties } from './properties';

export const costSegStudies = pgTable('cost_seg_studies', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  studyName: text('study_name').notNull(),
  status: text('status', { enum: ['draft', 'in_progress', 'completed'] }).default('draft'),
  taxRate: numeric('tax_rate').notNull().default('37'),
  discountRate: numeric('discount_rate').default('5'),
  bonusDepreciationRate: numeric('bonus_depreciation_rate').default('100'),
  // Tax year the property was placed in service (year 1 of the schedules)
  studyYear: integer('study_year').notNull(),
  // IRC §168(d)(3): >40% of the taxpayer's personal property placed in
  // service this year went in during Q4, so 5/7/15-year property uses the
  // mid-quarter tables. Opt-in — the app can't see the taxpayer's other assets.
  midQuarterConvention: boolean('mid_quarter_convention').notNull().default(false),
  results: jsonb('results'),
  totalFirstYearDeduction: numeric('total_first_year_deduction'),
  totalTaxSavings: numeric('total_tax_savings'),
  npvTaxSavings: numeric('npv_tax_savings'),
  notes: text('notes'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
}, (table) => [
  index('cost_seg_studies_property_id_idx').on(table.propertyId),
  index('cost_seg_studies_client_id_idx').on(table.clientId),
  index('cost_seg_studies_user_id_idx').on(table.userId),
  index('cost_seg_studies_user_id_created_at_idx').on(table.userId, table.createdAt),
]);
