import { pgTable, uuid, text, timestamp, numeric, integer, jsonb, index } from 'drizzle-orm/pg-core';
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
  studyYear: integer('study_year').notNull(),
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
]);
