-- Unified GRC risk ingestion queue (Red Team + lifecycle telemetry).

CREATE TYPE "RiskLifecycleStatus" AS ENUM ('INGESTED', 'REGISTERED', 'ACTIVE', 'RESOLVED');

CREATE TABLE IF NOT EXISTS "risk_registry" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "telemetry_value" TEXT NOT NULL DEFAULT '',
    "delta_label" TEXT NOT NULL DEFAULT '',
    "source_agent" TEXT NOT NULL DEFAULT 'SYSTEM',
    "lifecycle_status" "RiskLifecycleStatus" NOT NULL DEFAULT 'INGESTED',
    "risk_event_id" TEXT,
    "ingestion_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_registry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "risk_registry_tenant_status_idx" ON "risk_registry" ("tenant_id", "lifecycle_status");
CREATE INDEX IF NOT EXISTS "risk_registry_tenant_created_idx" ON "risk_registry" ("tenant_id", "created_at" DESC);
