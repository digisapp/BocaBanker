import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Serverless + Supavisor (transaction mode, port 6543):
// - prepare: false is required — prepared statements are not supported
//   across pooled transaction-mode connections.
// - Keep `max` small: every warm lambda instance holds its own pool, and the
//   pooler's client limit is shared across all of them. A handful per
//   instance still lets a route's Promise.all fan-out run concurrently.
// - Short idle_timeout lets frozen/idle lambdas release pooler slots.
// - Reuse the client across hot reloads in dev so connections don't leak.
const globalForDb = globalThis as unknown as { __pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    max: Number(process.env.DB_POOL_MAX) || 5,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
