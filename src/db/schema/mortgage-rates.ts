import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const mortgageRates = pgTable('mortgage_rates', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  weekOf: date('week_of').notNull(),
  rate30yr: numeric('rate_30yr'),
  rate15yr: numeric('rate_15yr'),
  rate5arm: numeric('rate_5_arm'),
  source: text('source').default('freddie_mac_pmms'),
  fetchedAt: timestamp('fetched_at').default(sql`now()`),
})
