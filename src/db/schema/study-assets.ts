import { pgTable, uuid, text, timestamp, numeric, integer, boolean } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { costSegStudies } from './cost-seg-studies';

export const studyAssets = pgTable('study_assets', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  studyId: uuid('study_id').references(() => costSegStudies.id),
  assetName: text('asset_name').notNull(),
  assetCategory: text('asset_category', {
    enum: ['personal_property_5yr', 'personal_property_7yr', 'land_improvements_15yr', 'building_27_5yr', 'building_39yr', 'land'],
  }).notNull(),
  recoveryPeriod: integer('recovery_period').notNull(),
  costBasis: numeric('cost_basis').notNull(),
  depreciationMethod: text('depreciation_method').default('MACRS'),
  bonusEligible: boolean('bonus_eligible').default(true),
  createdAt: timestamp('created_at').default(sql`now()`),
});

export const studyAssetsRelations = relations(studyAssets, ({ one }) => ({
  study: one(costSegStudies, {
    fields: [studyAssets.studyId],
    references: [costSegStudies.id],
  }),
}));
