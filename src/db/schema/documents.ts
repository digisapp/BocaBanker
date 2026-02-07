import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';
import { costSegStudies } from './cost-seg-studies';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  studyId: uuid('study_id').references(() => costSegStudies.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at').default(sql`now()`),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  study: one(costSegStudies, {
    fields: [documents.studyId],
    references: [costSegStudies.id],
  }),
}));
