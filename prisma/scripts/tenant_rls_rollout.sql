-- =============================================================================
-- Tenant Row Level Security rollout — REVIEW AND RUN MANUALLY.
--
-- Deliberately NOT placed in prisma/migrations: step 3 changes the database role
-- the application authenticates as, which cannot be done by a migration alone and
-- must be sequenced with a credential rotation. Applying policies without that
-- step is harmless but also useless; applying the role change without policies
-- in place removes the app's implicit bypass with nothing underneath it.
--
-- Current state (verified against the live database):
--   * the application connects as `postgres`, which has rolbypassrls = true
--   * three CRM tables already carry RESTRICTIVE tenant policies
--   * those policies have no effect, because the connecting role bypasses RLS
--
-- Run order: 1 → 2 → verify → 3 → verify → 4 (only once 3 is proven).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1 — Session binding helper.
-- Idempotent. Schema-qualified so a non-public search_path cannot miss it.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ironguard_set_session_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('app.current_tenant_id', p_tenant_id::text, true);
$$;


-- -----------------------------------------------------------------------------
-- STEP 2 — Enable RLS and attach a RESTRICTIVE tenant policy to every
-- tenant-scoped table. Safe to run while the app still connects as a BYPASSRLS
-- role: it is a no-op for that role, so it can land ahead of the cutover.
--
-- Discovery is dynamic (information_schema) so new tenant-scoped tables are
-- picked up on re-run rather than silently missed.
--
-- EXCLUSIONS, each deliberate:
--   user_role_assignments — the authorization source itself. Membership is
--     resolved before any tenant is bound, so a policy here deadlocks login.
--   companies — read cross-tenant while resolving which companies belong to a
--     tenant; scoping it breaks that resolution.
-- Both remain protected by application-layer predicates.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  col text;
  policy_name text;
  base_policy_name text;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname = c.table_name
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('tenant_id', 'tenantId')
      AND pc.relkind IN ('r', 'p')
      AND c.table_name NOT IN ('user_role_assignments', 'companies')
  LOOP
    col := quote_ident(r.column_name);
    policy_name := 'tenant_isolation_' || r.table_name;
    base_policy_name := 'tenant_access_base_' || r.table_name;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', base_policy_name, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, r.table_name);

    -- PostgreSQL requires at least one PERMISSIVE policy before RESTRICTIVE
    -- policies can grant rows. This neutral base grants no additional access
    -- because it is always ANDed with the tenant restriction below.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL
         USING (true)
         WITH CHECK (true)',
      base_policy_name, r.table_name
    );

    -- RESTRICTIVE: ANDs with every permissive path, so another permissive
    -- policy can never widen tenant scope. NULL current_setting yields no rows.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL
         USING (%s::text = current_setting(''app.current_tenant_id'', true))
         WITH CHECK (%s::text = current_setting(''app.current_tenant_id'', true))',
      policy_name, r.table_name, col, col
    );

    RAISE NOTICE 'RLS armed: public.% (%)', r.table_name, r.column_name;
  END LOOP;
END
$$;

-- Production-threat child ledgers do not duplicate tenant_id. Scope them through
-- their immutable ThreatEvent parent so a direct SQL query cannot cross tenants.
DO $$
DECLARE
  r RECORD;
  policy_name text;
  base_policy_name text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('agent_reasoning', 'threat_id'),
      ('AgentOperation', 'threatId'),
      ('WorkNote', 'threatId'),
      ('SustainabilityMetric', 'threatId')
    ) AS child(table_name, threat_column)
  LOOP
    policy_name := 'tenant_isolation_' || r.table_name;
    base_policy_name := 'tenant_access_base_' || r.table_name;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', base_policy_name, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, r.table_name);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true)',
      base_policy_name, r.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL
         USING (EXISTS (
           SELECT 1 FROM public."ThreatEvent" threat
           WHERE threat.id = %I::text
             AND threat.tenant_id::text = current_setting(''app.current_tenant_id'', true)
         ))
         WITH CHECK (EXISTS (
           SELECT 1 FROM public."ThreatEvent" threat
           WHERE threat.id = %I::text
             AND threat.tenant_id::text = current_setting(''app.current_tenant_id'', true)
         ))',
      policy_name, r.table_name, r.threat_column, r.threat_column
    );

    RAISE NOTICE 'RLS armed through ThreatEvent: public.%', r.table_name;
  END LOOP;
END
$$;


-- -----------------------------------------------------------------------------
-- VERIFY after step 2 — expect one row per tenant-scoped table, and expect the
-- application to behave exactly as before (policies inert under BYPASSRLS).
-- -----------------------------------------------------------------------------
-- SELECT tablename, policyname, permissive
-- FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'tenant_isolation_%'
-- ORDER BY tablename;


-- -----------------------------------------------------------------------------
-- STEP 3 — Least-privilege application role. THIS IS THE CUTOVER.
--
-- Nothing above changes behavior; this does. Sequence it with the credential
-- rotation and be ready to roll back by pointing DATABASE_URL at the old role.
--
-- Replace the password before running. Do not commit the real value.
-- -----------------------------------------------------------------------------
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ironframe_app') THEN
--     CREATE ROLE ironframe_app LOGIN PASSWORD 'REPLACE_ME';
--   END IF;
-- END
-- $$;
--
-- -- Explicitly NOT granted: BYPASSRLS, SUPERUSER, table ownership.
-- ALTER ROLE ironframe_app NOBYPASSRLS;
-- GRANT USAGE ON SCHEMA public TO ironframe_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ironframe_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ironframe_app;
-- GRANT EXECUTE ON FUNCTION public.ironguard_set_session_tenant(uuid) TO ironframe_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ironframe_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT USAGE, SELECT ON SEQUENCES TO ironframe_app;
--
-- Then rotate DATABASE_URL to ironframe_app and redeploy.


-- -----------------------------------------------------------------------------
-- STEP 3A — Narrow cross-tenant platform role. Provision before deploying code
-- that requires PRIVILEGED_DATABASE_URL. Never use this credential as DATABASE_URL.
--
-- The initial grant set supports only the reviewed platform operations:
-- cross-tenant BotAuditLog receipt discovery/read and global freeze state.
-- Add future tables explicitly after security review; do not grant ALL TABLES.
-- -----------------------------------------------------------------------------
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ironframe_privileged') THEN
--     CREATE ROLE ironframe_privileged LOGIN PASSWORD 'REPLACE_ME';
--   END IF;
-- END
-- $$;
--
-- ALTER ROLE ironframe_privileged NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
-- GRANT USAGE ON SCHEMA public TO ironframe_privileged;
-- GRANT SELECT ON TABLE public.tenants TO ironframe_privileged;
-- GRANT SELECT ON TABLE public."BotAuditLog" TO ironframe_privileged;
-- GRANT SELECT ON TABLE public.ironguard_violation TO ironframe_privileged;
-- GRANT SELECT, UPDATE ON TABLE public."SystemConfig" TO ironframe_privileged;
--
-- Store its pooled connection string as PRIVILEGED_DATABASE_URL. The runtime
-- rejects a credential whose database username matches DATABASE_URL.


-- -----------------------------------------------------------------------------
-- VERIFY after step 3 — as ironframe_app, this must return 0 with no tenant
-- bound, and only that tenant's rows once bound.
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) FROM ironboard_crm_deals;                      -- expect 0
-- SELECT public.ironguard_set_session_tenant('<tenant-uuid>');
-- SELECT COUNT(*) FROM ironboard_crm_deals;                      -- expect that tenant only


-- -----------------------------------------------------------------------------
-- STEP 4 — Only after step 3 is proven in production for a full release cycle.
-- FORCE also subjects the table owner to policies, closing the last bypass for
-- maintenance connections. Run per-table, not in bulk.
-- -----------------------------------------------------------------------------
-- ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;
