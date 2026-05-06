-- GRC Gold / Epic 8 — physical HASH(tenant_id) declarative partitioning for SimThreatEvent + AuditLog,
-- composite primary keys, and dependent FK rewiring (tenant-scoped isolation at storage layer).

-- ── SimThreatEvent: NOT NULL tenant_id ───────────────────────────────────────
UPDATE "SimThreatEvent" s
SET tenant_id = c."tenantId"
FROM companies c
WHERE s."tenantCompanyId" = c.id AND s.tenant_id IS NULL;

UPDATE "SimThreatEvent"
SET tenant_id = (SELECT id FROM tenants ORDER BY id LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE "SimThreatEvent" ALTER COLUMN tenant_id SET NOT NULL;

-- ── ReasoningLog (shadow brain) ─────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public."ReasoningLog"') IS NOT NULL THEN
    ALTER TABLE "ReasoningLog" ADD COLUMN IF NOT EXISTS "threat_tenant_id" UUID;
    UPDATE "ReasoningLog" r
    SET "threat_tenant_id" = s.tenant_id
    FROM "SimThreatEvent" s
    WHERE r."threatId" = s.id AND r."threat_tenant_id" IS NULL;
    DELETE FROM "ReasoningLog" WHERE "threat_tenant_id" IS NULL;
    ALTER TABLE "ReasoningLog" ALTER COLUMN "threat_tenant_id" SET NOT NULL;
    ALTER TABLE "ReasoningLog" DROP CONSTRAINT IF EXISTS "ReasoningLog_threatId_fkey";
  END IF;
END $$;

-- ── evidence_chapters (optional table) ─────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.evidence_chapters') IS NOT NULL THEN
    ALTER TABLE evidence_chapters ADD COLUMN IF NOT EXISTS risk_event_tenant_id UUID;
    UPDATE evidence_chapters e
    SET risk_event_tenant_id = s.tenant_id
    FROM "SimThreatEvent" s
    WHERE e.risk_event_id = s.id AND e.risk_event_tenant_id IS NULL;
    DELETE FROM evidence_chapters WHERE risk_event_tenant_id IS NULL;
    ALTER TABLE evidence_chapters ALTER COLUMN risk_event_tenant_id SET NOT NULL;
    ALTER TABLE evidence_chapters DROP CONSTRAINT IF EXISTS evidence_chapters_risk_event_id_fkey;
    DROP INDEX IF EXISTS evidence_chapters_risk_event_id_key;
    CREATE UNIQUE INDEX IF NOT EXISTS evidence_chapters_risk_tenant_event_uidx
      ON evidence_chapters (risk_event_tenant_id, risk_event_id);
  END IF;
END $$;

-- ── Drop FKs into SimThreatEvent(id) before table swap ───────────────────────
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_simThreatId_fkey";
ALTER TABLE "SimThreatEvent" DROP CONSTRAINT IF EXISTS "SimThreatEvent_tenant_id_fkey";

DROP INDEX IF EXISTS "SimThreatEvent_ingestion_fingerprint_key";

-- ── SimThreatEvent: rebuild as HASH-partitioned ─────────────────────────────
ALTER TABLE "SimThreatEvent" RENAME TO "SimThreatEvent__legacy";

CREATE TABLE "SimThreatEvent" (
  LIKE "SimThreatEvent__legacy" INCLUDING DEFAULTS INCLUDING GENERATED
) PARTITION BY HASH (tenant_id);

ALTER TABLE "SimThreatEvent"
  ADD CONSTRAINT "SimThreatEvent_pkey" PRIMARY KEY (tenant_id, id);

CREATE TABLE "SimThreatEvent_p0" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE "SimThreatEvent_p1" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE "SimThreatEvent_p2" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE "SimThreatEvent_p3" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE "SimThreatEvent_p4" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE "SimThreatEvent_p5" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE "SimThreatEvent_p6" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE "SimThreatEvent_p7" PARTITION OF "SimThreatEvent" FOR VALUES WITH (MODULUS 8, REMAINDER 7);

INSERT INTO "SimThreatEvent" SELECT * FROM "SimThreatEvent__legacy";

DROP TABLE "SimThreatEvent__legacy";

DROP TRIGGER IF EXISTS trg_simthreat_sync_ale_baseline ON "SimThreatEvent";
CREATE TRIGGER trg_simthreat_sync_ale_baseline
  BEFORE INSERT OR UPDATE OF "financialRisk_cents", "base_impact_cents", "governance_impact_multiplier"
  ON "SimThreatEvent"
  FOR EACH ROW
  EXECUTE PROCEDURE simthreat_sync_ale_baseline();

ALTER TABLE "SimThreatEvent"
  ADD CONSTRAINT "SimThreatEvent_tenant_id_fkey"
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "SimThreatEvent_tenant_ingestion_fingerprint_key"
  ON "SimThreatEvent" (tenant_id, ingestion_fingerprint);

CREATE INDEX IF NOT EXISTS "SimThreatEvent_tenantCompanyId_idx" ON "SimThreatEvent" ("tenantCompanyId");
CREATE INDEX IF NOT EXISTS "SimThreatEvent_tenantCompanyId_createdAt_idx"
  ON "SimThreatEvent" ("tenantCompanyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SimThreatEvent_tenant_id_createdAt_idx"
  ON "SimThreatEvent" (tenant_id, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "SimThreatEvent_complianceFramework_idx" ON "SimThreatEvent" ("complianceFramework");

DO $$
BEGIN
  IF to_regclass('public."ReasoningLog"') IS NOT NULL THEN
    ALTER TABLE "ReasoningLog"
      ADD CONSTRAINT "ReasoningLog_threat_tenant_threatId_fkey"
      FOREIGN KEY ("threat_tenant_id", "threatId")
      REFERENCES "SimThreatEvent" (tenant_id, id) ON DELETE CASCADE ON UPDATE CASCADE;
    CREATE INDEX IF NOT EXISTS "ReasoningLog_threat_tenant_threatId_idx" ON "ReasoningLog" ("threat_tenant_id", "threatId");
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.evidence_chapters') IS NOT NULL THEN
    ALTER TABLE evidence_chapters
      ADD CONSTRAINT evidence_chapters_risk_fk
      FOREIGN KEY (risk_event_tenant_id, risk_event_id)
      REFERENCES "SimThreatEvent" (tenant_id, id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Forensic seal ledger → SimThreatEvent (referential integrity)
ALTER TABLE forensic_seal_ledger DROP CONSTRAINT IF EXISTS forensic_seal_ledger_risk_fk;
ALTER TABLE forensic_seal_ledger
  ADD CONSTRAINT forensic_seal_ledger_risk_fk
  FOREIGN KEY (tenant_id, risk_event_id)
  REFERENCES "SimThreatEvent" (tenant_id, id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AuditLog: sim_threat tenant + NOT NULL tenant_id + composite PK + HASH ─
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS sim_threat_tenant_id UUID;

UPDATE "AuditLog" a
SET sim_threat_tenant_id = s.tenant_id
FROM "SimThreatEvent" s
WHERE a."simThreatId" = s.id AND a.sim_threat_tenant_id IS NULL;

UPDATE "AuditLog" a
SET tenant_id = COALESCE(
    a.tenant_id,
    a.governance_tenant_uuid,
    a.sim_threat_tenant_id,
    (SELECT c."tenantId" FROM "ThreatEvent" t JOIN companies c ON c.id = t."tenantCompanyId" WHERE t.id = a."threatId" LIMIT 1),
    (SELECT id FROM tenants ORDER BY id LIMIT 1)
  )
WHERE a.tenant_id IS NULL;

ALTER TABLE "AuditLog" ALTER COLUMN tenant_id SET NOT NULL;

-- audit_comments: composite FK to AuditLog
ALTER TABLE audit_comments ADD COLUMN IF NOT EXISTS audit_log_tenant_id UUID;

UPDATE audit_comments ac
SET audit_log_tenant_id = al.tenant_id
FROM "AuditLog" al
WHERE ac.audit_log_id = al.id AND ac.audit_log_tenant_id IS NULL;

DELETE FROM audit_comments WHERE audit_log_tenant_id IS NULL;

ALTER TABLE audit_comments ALTER COLUMN audit_log_tenant_id SET NOT NULL;

ALTER TABLE audit_comments DROP CONSTRAINT IF EXISTS audit_comments_audit_log_id_fkey;

ALTER TABLE "AuditLog" RENAME TO "AuditLog__legacy";

CREATE TABLE "AuditLog" (
  LIKE "AuditLog__legacy" INCLUDING DEFAULTS
) PARTITION BY HASH (tenant_id);

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (tenant_id, id);

CREATE TABLE "AuditLog_p0" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE "AuditLog_p1" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE "AuditLog_p2" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE "AuditLog_p3" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE "AuditLog_p4" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE "AuditLog_p5" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE "AuditLog_p6" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE "AuditLog_p7" PARTITION OF "AuditLog" FOR VALUES WITH (MODULUS 8, REMAINDER 7);

INSERT INTO "AuditLog" SELECT * FROM "AuditLog__legacy";

DROP TABLE "AuditLog__legacy";

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_threatId_fkey"
  FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_simThreat_fk"
  FOREIGN KEY (sim_threat_tenant_id, "simThreatId")
  REFERENCES "SimThreatEvent"(tenant_id, id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE audit_comments
  ADD CONSTRAINT audit_comments_audit_log_fk
  FOREIGN KEY (audit_log_tenant_id, audit_log_id)
  REFERENCES "AuditLog" (tenant_id, id) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS audit_comments_audit_log_idx ON audit_comments (audit_log_tenant_id, audit_log_id);

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_tenant_id_createdAt_idx" ON "AuditLog" (tenant_id, "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_governance_tenant_uuid_createdAt_idx" ON "AuditLog" (governance_tenant_uuid, "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_isSimulation_simThreatId_idx" ON "AuditLog" ("isSimulation", "simThreatId");

COMMENT ON TABLE "SimThreatEvent" IS 'Shadow RiskEvent ledger — HASH partitioned by tenant_id (8 partitions).';
COMMENT ON TABLE "AuditLog" IS 'Audit trail — HASH partitioned by tenant_id (8 partitions).';
