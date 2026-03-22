import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull().default(true),
  updatedAt: timestamp('updated_at').default(sql`now()`),
});
