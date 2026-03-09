import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  template: text('template'),
  status: text('status', { enum: ['sent', 'delivered', 'bounced', 'failed'] }).default('sent'),
  resendId: text('resend_id'),
  sentAt: timestamp('sent_at').default(sql`now()`),
}, (table) => [
  index('email_logs_user_id_idx').on(table.userId),
  index('email_logs_client_id_idx').on(table.clientId),
]);

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
