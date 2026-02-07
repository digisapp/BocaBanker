import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { properties } from './properties';
import { costSegStudies } from './cost-seg-studies';
import { documents } from './documents';
import { emailLogs } from './email-logs';

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  status: text('status', { enum: ['active', 'prospect', 'inactive'] }).default('active'),
  tags: text('tags').array().default(sql`'{}'::text[]`),
  notes: text('notes'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  source: text('source'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  properties: many(properties),
  costSegStudies: many(costSegStudies),
  documents: many(documents),
  emailLogs: many(emailLogs),
}));
