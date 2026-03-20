import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';

export const emails = pgTable('emails', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  direction: text('direction', { enum: ['inbound', 'outbound'] }).notNull(),
  fromEmail: text('from_email').notNull(),
  fromName: text('from_name'),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  template: text('template'),
  status: text('status', {
    enum: ['sent', 'delivered', 'bounced', 'failed', 'received', 'read', 'replied'],
  }).notNull().default('sent'),
  resendId: text('resend_id'),
  threadId: uuid('thread_id'),
  inReplyToId: uuid('in_reply_to_id'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => [
  index('emails_user_id_idx').on(table.userId),
  index('emails_client_id_idx').on(table.clientId),
  index('emails_direction_idx').on(table.direction),
  index('emails_status_idx').on(table.status),
  index('emails_thread_id_idx').on(table.threadId),
  index('emails_from_email_idx').on(table.fromEmail),
  index('emails_is_read_idx').on(table.isRead),
  index('emails_created_at_idx').on(table.createdAt),
]);
