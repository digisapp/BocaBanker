import { pgTable, uuid, text, timestamp, boolean, index, jsonb, real } from 'drizzle-orm/pg-core';
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
  toName: text('to_name'),
  replyTo: text('reply_to'),
  cc: text('cc'),
  bcc: text('bcc'),
  subject: text('subject').notNull().default('(no subject)'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  template: text('template'),
  status: text('status', {
    enum: ['sent', 'delivered', 'bounced', 'failed', 'received', 'read', 'replied'],
  }).notNull().default('received'),
  resendId: text('resend_id'),
  threadId: uuid('thread_id'),
  inReplyToId: uuid('in_reply_to_id'),
  sentBy: uuid('sent_by').references(() => users.id, { onDelete: 'set null' }),
  isRead: boolean('is_read').default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').default(sql`now()`),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
  // AI columns
  aiDraftHtml: text('ai_draft_html'),
  aiDraftText: text('ai_draft_text'),
  aiCategory: text('ai_category'),
  aiConfidence: real('ai_confidence'),
  aiProcessedAt: timestamp('ai_processed_at'),
  aiSummary: text('ai_summary'),
}, (table) => [
  index('emails_user_id_idx').on(table.userId),
  index('emails_client_id_idx').on(table.clientId),
  index('emails_direction_idx').on(table.direction),
  index('emails_status_idx').on(table.status),
  index('emails_thread_id_idx').on(table.threadId),
  index('emails_from_email_idx').on(table.fromEmail),
  index('emails_to_email_idx').on(table.toEmail),
  index('emails_is_read_idx').on(table.isRead),
  index('emails_created_at_idx').on(table.createdAt),
  index('emails_resend_id_idx').on(table.resendId),
]);
