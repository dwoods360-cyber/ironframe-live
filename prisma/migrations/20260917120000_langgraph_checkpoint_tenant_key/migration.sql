-- LangGraph PostgresSaver tables are created by checkpointer.setup() with no tenant
-- column. Give them a database-enforceable tenant key derived from a prefixed
-- thread_id (`{tenantUuid}::{threadKey}`) and arm RLS for the later role cutover.

CREATE TABLE IF NOT EXISTS checkpoint_migrations (
    v INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS checkpoint_blobs (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE IF NOT EXISTS checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    blob BYTEA NOT NULL,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

INSERT INTO checkpoint_migrations (v) VALUES (0), (1), (2), (3), (4)
ON CONFLICT (v) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ironguard_checkpoint_thread_tenant(p_thread_id text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_thread_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}::'
      AND lower(substring(p_thread_id from 1 for 36)) <> '00000000-0000-0000-0000-000000000000'
    THEN CAST(substring(p_thread_id from 1 for 36) AS uuid)
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.ironguard_stamp_langgraph_checkpoint_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tenant_id := public.ironguard_checkpoint_thread_tenant(NEW.thread_id);
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'LANGGRAPH_CHECKPOINT_TENANT_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ironguard_arm_langgraph_checkpoint_tenant_keys()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tbl text;
  policy_name text;
  base_policy_name text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['checkpoints', 'checkpoint_blobs', 'checkpoint_writes']
  LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID', tbl);
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)',
      tbl || '_tenant_id_idx',
      tbl
    );

    EXECUTE format('DROP TRIGGER IF EXISTS ironguard_stamp_langgraph_%I_tenant ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER ironguard_stamp_langgraph_%I_tenant
         BEFORE INSERT OR UPDATE OF thread_id, tenant_id ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.ironguard_stamp_langgraph_checkpoint_tenant()',
      tbl,
      tbl
    );

    policy_name := 'tenant_isolation_' || tbl;
    base_policy_name := 'tenant_access_base_' || tbl;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', base_policy_name, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true)',
      base_policy_name,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL
         USING (tenant_id::text = current_setting(''app.current_tenant_id'', true))
         WITH CHECK (tenant_id::text = current_setting(''app.current_tenant_id'', true))',
      policy_name,
      tbl
    );
  END LOOP;

  UPDATE public.checkpoints
  SET tenant_id = public.ironguard_checkpoint_thread_tenant(thread_id)
  WHERE tenant_id IS NULL
    AND public.ironguard_checkpoint_thread_tenant(thread_id) IS NOT NULL;

  UPDATE public.checkpoint_blobs
  SET tenant_id = public.ironguard_checkpoint_thread_tenant(thread_id)
  WHERE tenant_id IS NULL
    AND public.ironguard_checkpoint_thread_tenant(thread_id) IS NOT NULL;

  UPDATE public.checkpoint_writes
  SET tenant_id = public.ironguard_checkpoint_thread_tenant(thread_id)
  WHERE tenant_id IS NULL
    AND public.ironguard_checkpoint_thread_tenant(thread_id) IS NOT NULL;
END;
$$;

SELECT public.ironguard_arm_langgraph_checkpoint_tenant_keys();
