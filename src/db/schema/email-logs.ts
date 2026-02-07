import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  template: text('template'),
  status: text('status', { enum: ['sent', 'delivered', 'bounced', 'failed'] }).default('sent'),
  resendId: text('resend_id'),
  sentAt: timestamp('sent_at').default(sql`now()`),
});

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [emailLogs.clientId],
    references: [clients.id],
  }),
}));
