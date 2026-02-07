import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { clients } from './clients';
import { properties } from './properties';
import { costSegStudies } from './cost-seg-studies';
import { chatConversations } from './chat-conversations';
import { documents } from './documents';
import { emailLogs } from './email-logs';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').unique().notNull(),
  fullName: text('full_name'),
  role: text('role', { enum: ['admin', 'analyst', 'viewer'] }).default('viewer'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  properties: many(properties),
  costSegStudies: many(costSegStudies),
  chatConversations: many(chatConversations),
  documents: many(documents),
  emailLogs: many(emailLogs),
}));
