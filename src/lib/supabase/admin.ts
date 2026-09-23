import { createClient } from '@supabase/supabase-js'

// Service-role client for server-side use only. There is no user session to
// persist or refresh here; disabling these avoids per-instance timers and
// accidental session state on a shared, privileged client.
export const supabaseAdmin = createClient(
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
