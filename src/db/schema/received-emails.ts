import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';

export const receivedEmails = pgTable('received_emails', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  fromEmail: text('from_email').notNull(),
  fromName: text('from_name'),
  toEmail: text('to_email').notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  resendId: text('resend_id'),
  inReplyToResendId: text('in_reply_to_resend_id'),
  isRead: boolean('is_read').default(false),
  receivedAt: timestamp('received_at').default(sql`now()`),
}, (table) => [
  index('received_emails_user_id_idx').on(table.userId),
  index('received_emails_client_id_idx').on(table.clientId),
  index('received_emails_from_email_idx').on(table.fromEmail),
  index('received_emails_is_read_idx').on(table.isRead),
]);
