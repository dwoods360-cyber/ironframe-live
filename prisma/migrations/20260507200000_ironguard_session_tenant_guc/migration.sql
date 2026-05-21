-- Ironguard: session GUC for PostgreSQL Row-Level Security (RLS) policies.
-- Call via SELECT ironguard_set_session_tenant('<uuid>'::uuid) at the start of a request-scoped transaction
-- before tenant-bound queries once RLS is enabled on individual tables.
--
-- Rollout note: enabling FORCE ROW LEVEL SECURITY on tables without setting this GUC in every code path
-- will return zero rows or fail policies — phase policy enablement with application middleware.

CREATE OR REPLACE FUNCTION ironguard_set_session_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$;

COMMENT ON FUNCTION ironguard_set_session_tenant(uuid) IS 'Ironguard: SET LOCAL app.current_tenant_id for tenant-scoped RLS.';
