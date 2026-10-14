import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Created on first use, not at import: createClient throws without a key, and
// at module scope that took down every route importing this file (and could
// fail `next build`) whenever the env var was missing.
function getClient(): SupabaseClient {
  if (!_client) {
    // Service-role client for server-side use only. There is no user session
    // to persist or refresh here; disabling these avoids per-instance timers
    // and accidental session state on a shared, privileged client.
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )
  }
  return _client
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
