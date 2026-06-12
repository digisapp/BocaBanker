-- ============================================================================
-- MANUAL DB STEPS — run once in the Supabase Dashboard SQL editor
-- (Dashboard > SQL Editor > New query > paste > Run)
--
-- Why manual: these statements touch tables owned by the `postgres` role,
-- which the app's `app_user` credentials cannot ALTER. Everything that could
-- be applied with app_user credentials has already been applied directly:
--   * emails: partial unique index on resend_id (webhook idempotency)
--   * data cleanups (dangling refs / duplicates) — none found
--   * RLS enabled on emails, reviews, platform_settings, received_emails
--
-- This script is idempotent — safe to re-run.
-- ============================================================================

-- 1. Residential cost-seg studies: 27.5-year recovery period needs a real column
ALTER TABLE public.study_assets ALTER COLUMN recovery_period SET DATA TYPE real;

-- 2. Referential integrity for lead conversion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_converted_client_id_clients_id_fk'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_converted_client_id_clients_id_fk
      FOREIGN KEY (converted_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Indexes for common lead queries
CREATE INDEX IF NOT EXISTS leads_user_id_status_idx ON public.leads (user_id, status);
CREATE INDEX IF NOT EXISTS leads_user_id_created_at_idx ON public.leads (user_id, created_at);
CREATE INDEX IF NOT EXISTS leads_member_name_idx ON public.leads (member_name);

-- 4. Mortgage rates: dedupe guard for concurrent fetch runs
CREATE UNIQUE INDEX IF NOT EXISTS mortgage_rates_week_of_unique ON public.mortgage_rates (week_of);

-- 5. Lock down the PostgREST surface: RLS on every remaining table, with an
--    allow-all policy for app_user (it is not the owner of these tables, so it
--    needs explicit policies; the browser only uses Auth + Storage, so no
--    anon/authenticated access to public tables is needed at all).
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_user_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY app_user_all ON public.%I FOR ALL TO app_user USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- 6. Belt-and-braces: revoke direct PostgREST role access (current + future tables)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 7. Verify
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
