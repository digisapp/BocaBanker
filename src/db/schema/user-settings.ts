import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'

export const userSettings = pgTable('user_settings', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),

  // Arive
  ariveLink: text('arive_link'),
  ariveCompanyName: text('arive_company_name'),

  // Rate alert preferences
  rateAlertEnabled: boolean('rate_alert_enabled').default(false),
  rateAlertThresholdBps: numeric('rate_alert_threshold_bps'),

  createdAt: timestamp('created_at').default(sql`now()`),
  updatedAt: timestamp('updated_at').default(sql`now()`),
})

