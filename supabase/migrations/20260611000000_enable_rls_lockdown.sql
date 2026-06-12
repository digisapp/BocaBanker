-- Lock down the PostgREST surface.
--
-- Context: every public table previously had RLS disabled while the `public`
-- schema is exposed through PostgREST (supabase/config.toml) and the anon key
-- ships to the browser. The browser client only uses Auth + Storage, so no
-- anon/authenticated access to public tables is needed at all.
--
-- The app's runtime connection is the `app_user` role (non-owner), so RLS
-- must come with explicit allow-all policies for `app_user`, otherwise the
-- app itself would be locked out. Data isolation between app users remains
-- enforced at the application layer (per-user WHERE clauses); this migration
-- closes the parallel unauthenticated PostgREST path.

-- 1) Revoke table access from the PostgREST roles (current and future tables).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 2) Enable RLS on every app table with an allow-all policy for app_user.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_user_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY app_user_all ON public.%I FOR ALL TO app_user USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END
$$;

-- NOTE (manual step, do not skip): the app_user password was committed to git
-- in 20250208000001_app_user.sql. Rotate it:
--   ALTER ROLE app_user WITH PASSWORD '<new strong password>';
-- then update DATABASE_URL in Vercel/.env accordingly.
