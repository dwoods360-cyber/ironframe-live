-- GRC Gold — tenant-aligned columns, HASH-partitioned forensic seal ledger, partition/HNSW notes.
-- Risk (SimThreatEvent) & AuditLog: tenant_id for declarative partition keys and partition pruning.
-- Full conversion of SimThreatEvent / AuditLog to declarative PARTITION BY requires composite PKs and FK
-- updates (ReasoningLog, audit_comments); deferred — tenant_id + indexes deliver isolation-aligned plans today.

-- ---------------------------------------------------------------------------
-- SimThreatEvent (Prisma RiskEvent): denormalized tenant UUID from Company
-- ---------------------------------------------------------------------------
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE "SimThreatEvent" s
SET tenant_id = c."tenantId"
FROM companies c
WHERE s."tenantCompanyId" = c.id
  AND s.tenant_id IS NULL;

UPDATE "SimThreatEvent"
SET tenant_id = (SELECT "tenantId" FROM companies ORDER BY id ASC LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE "SimThreatEvent"
  DROP CONSTRAINT IF EXISTS "SimThreatEvent_tenant_id_fkey";

ALTER TABLE "SimThreatEvent"
  ADD CONSTRAINT "SimThreatEvent_tenant_id_fkey"
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SimThreatEvent_tenant_id_createdAt_idx"
  ON "SimThreatEvent" (tenant_id, "createdAt" DESC);

COMMENT ON COLUMN "SimThreatEvent".tenant_id IS 'Tenant scope for partition-aligned queries; mirrors companies.tenantId.';

-- ---------------------------------------------------------------------------
-- AuditLog: tenant_id for HASH partition strategy (mirrors governance_tenant_uuid / SimThreatEvent)
-- ---------------------------------------------------------------------------
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE "AuditLog"
SET tenant_id = governance_tenant_uuid
WHERE tenant_id IS NULL AND governance_tenant_uuid IS NOT NULL;

UPDATE "AuditLog" a
SET tenant_id = s.tenant_id
FROM "SimThreatEvent" s
WHERE a."simThreatId" = s.id AND a.tenant_id IS NULL AND s.tenant_id IS NOT NULL;

UPDATE "AuditLog" a
SET tenant_id = c."tenantId"
FROM "ThreatEvent" t
JOIN companies c ON c.id = t."tenantCompanyId"
WHERE a."threatId" = t.id AND a.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS "AuditLog_tenant_id_createdAt_idx"
  ON "AuditLog" (tenant_id, "createdAt" DESC);

COMMENT ON COLUMN "AuditLog".tenant_id IS 'Tenant scope for partition-aligned audit queries.';

-- ---------------------------------------------------------------------------
-- Forensic seal ledger — HASH partitioned by tenant_id (immutable snapshots; JSONB seal body)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forensic_seal_ledger (
  tenant_id UUID NOT NULL,
  id TEXT NOT NULL,
  risk_event_id TEXT NOT NULL,
  governance_hash TEXT,
  seal_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
) PARTITION BY HASH (tenant_id);

CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p0 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p1 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p2 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p3 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p4 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p5 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p6 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE IF NOT EXISTS forensic_seal_ledger_p7 PARTITION OF forensic_seal_ledger FOR VALUES WITH (MODULUS 8, REMAINDER 7);

CREATE INDEX IF NOT EXISTS forensic_seal_ledger_risk_event_idx ON forensic_seal_ledger (risk_event_id);

ALTER TABLE forensic_seal_ledger
  DROP CONSTRAINT IF EXISTS forensic_seal_ledger_tenant_id_fkey;
ALTER TABLE forensic_seal_ledger
  ADD CONSTRAINT forensic_seal_ledger_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMENT ON TABLE forensic_seal_ledger IS 'GRC Gold — partitioned forensic seal snapshots per tenant (Agent 5/13 bundles).';

-- Agent 13 HNSW (cosine, pgvector `<=>`): only if corpus table exists in this database.
DO $$
BEGIN
  IF to_regclass('public.agent13_hybrid_chunk') IS NOT NULL THEN
    EXECUTE $hnsw$
      CREATE INDEX IF NOT EXISTS agent13_hybrid_chunk_embedding_hnsw
        ON agent13_hybrid_chunk USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    $hnsw$;
  END IF;
END $$;
