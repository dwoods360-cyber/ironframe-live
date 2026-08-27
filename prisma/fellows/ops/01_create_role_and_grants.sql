-- Run as a privileged role (Supabase: postgres / dashboard SQL).
-- Creates a least-privilege login for Academic Fellowship APIs.
-- After this, point FELLOWS_DATABASE_URL at ironframe_fellows_app (not the Path B role).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ironframe_fellows_app') THEN
    CREATE ROLE ironframe_fellows_app LOGIN PASSWORD 'REPLACE_WITH_LONG_RANDOM_SECRET';
  END BY;
END
$$;

GRANT USAGE ON SCHEMA academic_fellows TO ironframe_fellows_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA academic_fellows TO ironframe_fellows_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA academic_fellows TO ironframe_fellows_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA academic_fellows
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ironframe_fellows_app;

-- Explicitly deny Path B surface (defense if search_path is mis-set).
REVOKE ALL ON SCHEMA public FROM ironframe_fellows_app;
-- Optional: also revoke from specific tenant tables if public USAGE remains for extensions.

-- Prefer forcing RLS for this role.
ALTER ROLE ironframe_fellows_app SET search_path TO academic_fellows;

COMMENT ON ROLE ironframe_fellows_app IS
  'Academic Fellowship app role — academic_fellows schema only; never Path B Tenant/Evidence.';
