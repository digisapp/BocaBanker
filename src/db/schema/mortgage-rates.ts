import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  uniqueIndex,
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
}, (table) => [
  // dedupe guard: concurrent rate-fetch runs must not insert the same week twice
  uniqueIndex('mortgage_rates_week_of_unique').on(table.weekOf),
])
