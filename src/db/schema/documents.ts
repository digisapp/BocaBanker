import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';
import { costSegStudies } from './cost-seg-studies';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  studyId: uuid('study_id').references(() => costSegStudies.id, { onDelete: 'set null' }),
  fileName: text('file_name').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  storagePath: text('storage_path').notNull(),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => [
  index('documents_user_id_idx').on(table.userId),
  index('documents_client_id_idx').on(table.clientId),
  index('documents_study_id_idx').on(table.studyId),
]);
