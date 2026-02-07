import { pgTable, uuid, text, timestamp, numeric, integer, date } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';
import { costSegStudies } from './cost-seg-studies';

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid('client_id').references(() => clients.id),
  userId: uuid('user_id').references(() => users.id),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  propertyType: text('property_type', {
    enum: ['commercial', 'residential', 'mixed-use', 'industrial', 'retail', 'hospitality', 'healthcare', 'multifamily'],
  }).notNull(),
  purchasePrice: numeric('purchase_price').notNull(),
  purchaseDate: date('purchase_date'),
  buildingValue: numeric('building_value'),
  landValue: numeric('land_value'),
  squareFootage: integer('square_footage'),
  yearBuilt: integer('year_built'),
  description: text('description'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  client: one(clients, {
    fields: [properties.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  costSegStudies: many(costSegStudies),
}));
