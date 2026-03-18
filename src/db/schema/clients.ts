import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
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
}, (table) => [
  index('clients_user_id_idx').on(table.userId),
]);
