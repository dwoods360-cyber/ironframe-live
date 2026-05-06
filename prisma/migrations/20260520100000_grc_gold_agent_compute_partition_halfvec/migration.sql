-- GRC Gold — production scale: agentic compute ledger (native HASH partitioning) + high-dimension vector lane.
-- SimThreatEvent (`RiskEvent`), `AuditLog`: declarative HASH(tenant_id) requires composite PK + FK rewiring
-- (ReasoningLog, evidence_chapters, audit_comments). Execute that cutover in a maintenance window; `forensic_seal_ledger`
-- is already HASH-partitioned in migration 20260510143000.

-- ---------------------------------------------------------------------------
-- Agent compute log — tenant-isolated billing / audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_compute_log (
  tenant_id UUID NOT NULL,
  id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  operation_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
) PARTITION BY HASH (tenant_id);

DO $$
DECLARE i int;
BEGIN
  FOR i IN 0..15 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS agent_compute_log_p%s PARTITION OF agent_compute_log FOR VALUES WITH (MODULUS 16, REMAINDER %s);',
      i, i
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS agent_compute_log_tenant_created_idx
  ON agent_compute_log (tenant_id, created_at DESC);

ALTER TABLE agent_compute_log
  DROP CONSTRAINT IF EXISTS agent_compute_log_tenant_id_fkey;
ALTER TABLE agent_compute_log
  ADD CONSTRAINT agent_compute_log_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE agent_compute_log IS 'GRC Gold — per-tenant agent duration/tokens for Resource Monitor and invoices.';

-- ---------------------------------------------------------------------------
-- pgvector: halfvec lane for embeddings dimension > 2000 (Postgres 18 + pgvector 0.8+)
-- Standard `vector` type is capped at 2000 dims; use `halfvec` + cosine HNSW for HD models.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- High-dimension lane (halfvec) — optional if the cluster ships pgvector with `halfvec` (embeddings > 2000-D).
DO $hd$
DECLARE
  j int;
BEGIN
  CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_hd (
    id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    tenant_company_id BIGINT NOT NULL,
    tenant_id UUID NOT NULL,
    source_kind TEXT NOT NULL,
    source_id TEXT NOT NULL,
    body_digest TEXT NOT NULL,
    embedding halfvec(3072) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_company_id, id)
  ) PARTITION BY HASH (tenant_company_id);

  FOR j IN 0..7 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS agent13_hybrid_chunk_hd_p%s PARTITION OF agent13_hybrid_chunk_hd FOR VALUES WITH (MODULUS 8, REMAINDER %s);',
      j, j
    );
  END LOOP;

  EXECUTE $idx$
    CREATE INDEX IF NOT EXISTS agent13_hybrid_chunk_hd_embedding_hnsw
      ON agent13_hybrid_chunk_hd USING hnsw (embedding halfvec_cosine_ops)
      WITH (m = 16, ef_construction = 64)
  $idx$;

  EXECUTE 'CREATE INDEX IF NOT EXISTS agent13_hybrid_chunk_hd_tenant_created_idx ON agent13_hybrid_chunk_hd (tenant_company_id, created_at DESC)';

  EXECUTE 'COMMENT ON TABLE agent13_hybrid_chunk_hd IS ''High-dimension hybrid corpus (halfvec 3072); cosine HNSW when dim > 2000.''';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'agent13_hybrid_chunk_hd skipped (requires halfvec / pgvector build): %', SQLERRM;
END $hd$;

COMMENT ON TABLE "SimThreatEvent" IS 'Shadow RiskEvent ledger. Native HASH(tenant_id) partitioning requires composite PK (tenant_id,id) and dependent FK updates (maintenance window).';
COMMENT ON TABLE "AuditLog" IS 'Audit trail; align HASH(tenant_id) after NOT NULL tenant_id and composite FKs on child tables.';
