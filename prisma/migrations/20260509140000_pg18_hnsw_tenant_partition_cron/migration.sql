-- Postgres 18 / SaaS scale: Agent 13 hybrid corpus (pgvector + HNSW), HASH partitioning by tenant company,
-- Sentinel Agent 17 outbox + optional pg_cron, tenant-scoped indexes on high-volume threat tables.
--
-- Extensions: `vector` and `pg_cron` may require superuser / provider support (e.g. enable in RDS/Supabase console).
-- AIO: PostgreSQL 18 asynchronous I/O is controlled server-side (`io_method`, `io_workers`); pair with parallel
-- query settings in the app via `lib/db/hybridRetrievalSession.ts`.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Agent 13: hybrid retrieval corpus — HASH-partitioned by tenant_company_id (strict tenant slice + prune).
-- PK includes partition key (PostgreSQL requirement for partitioned tables).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk (
  id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_company_id BIGINT NOT NULL,
  tenant_id UUID NOT NULL,
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  body_digest TEXT NOT NULL,
  content_tsv tsvector,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_company_id, id)
) PARTITION BY HASH (tenant_company_id);

CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p0 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p1 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p2 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p3 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p4 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p5 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p6 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_p7 PARTITION OF agent13_hybrid_chunk FOR VALUES WITH (MODULUS 8, REMAINDER 7);

-- HNSW approximate nearest neighbor (cosine distance operator class).
CREATE INDEX IF NOT EXISTS agent13_hybrid_chunk_embedding_hnsw
  ON agent13_hybrid_chunk USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Lexical leg for hybrid BM25/tsvector-style filtering (pair with vector KNN in application SQL).
CREATE INDEX IF NOT EXISTS agent13_hybrid_chunk_content_tsv_gin
  ON agent13_hybrid_chunk USING gin (content_tsv);

CREATE INDEX IF NOT EXISTS agent13_hybrid_chunk_tenant_created_idx
  ON agent13_hybrid_chunk (tenant_company_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Agent 17: durable outbox for automated Sentinel sweeps (worker / HTTP cron drains this).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sentinel_automation_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_kind TEXT NOT NULL DEFAULT 'AGENT17_SENTINEL_SWEEP',
  tenant_scope UUID,
  status TEXT NOT NULL DEFAULT 'PENDING',
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS sentinel_automation_outbox_claim_idx
  ON sentinel_automation_outbox (status, run_after)
  WHERE status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Tenant isolation + time-range probes on existing threat ledgers (non-blocking index builds).
-- Full conversion of "SimThreatEvent" / "ThreatEvent" to declarative partitioning is an offline DBA task:
-- requires row migration, FK re-pointing, and maintenance window — not done in this migration.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "SimThreatEvent_tenantCompanyId_createdAt_idx"
  ON "SimThreatEvent" ("tenantCompanyId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ThreatEvent_tenantCompanyId_createdAt_idx"
  ON "ThreatEvent" ("tenantCompanyId", "createdAt" DESC);

-- ---------------------------------------------------------------------------
-- pg_cron: enqueue Agent 17 sweep jobs every 15 minutes (if extension is installed).
-- Enable once with superuser / host console:  CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Managed providers (RDS, Supabase, etc.) often expose this in a dashboard instead of DDL.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ironframe_agent17_sentinel_sweep') THEN
      PERFORM cron.schedule(
        'ironframe_agent17_sentinel_sweep',
        '*/15 * * * *',
        $cron$INSERT INTO public.sentinel_automation_outbox (job_kind, status) VALUES ('AGENT17_SENTINEL_SWEEP', 'PENDING')$cron$
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'cron.job not available; install pg_cron or use HTTP / worker cron to enqueue outbox rows.';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;
