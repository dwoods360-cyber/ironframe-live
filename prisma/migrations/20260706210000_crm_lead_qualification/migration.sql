-- IronBoard CRM lead qualification: beachhead sectors, ingestion lineage, priority scoring, SUSPECT stage.

CREATE TYPE "IronboardBeachheadSector" AS ENUM (
  'REGIONAL_BHC',
  'UTILITY_NERC',
  'MSSP_ENCLAVE',
  'HEALTH_HIPAA',
  'UNCLASSIFIED'
);

CREATE TYPE "IronboardLeadIngestionSource" AS ENUM (
  'MANUAL_INPUT',
  'INBOUND_PORTAL',
  'AUTONOMOUS_CRAWLER'
);

ALTER TYPE "IronboardLeadStage" ADD VALUE IF NOT EXISTS 'SUSPECT';

ALTER TABLE "ironboard_crm_contacts"
  ADD COLUMN IF NOT EXISTS "industry_sector" "IronboardBeachheadSector",
  ADD COLUMN IF NOT EXISTS "detected_trigger" TEXT,
  ADD COLUMN IF NOT EXISTS "ingestion_source" "IronboardLeadIngestionSource" NOT NULL DEFAULT 'MANUAL_INPUT',
  ADD COLUMN IF NOT EXISTS "priority_score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "qualification_signals" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "ironboard_crm_contacts_tenant_id_priority_score_idx"
  ON "ironboard_crm_contacts"("tenant_id", "priority_score");

CREATE INDEX IF NOT EXISTS "ironboard_crm_contacts_tenant_id_industry_sector_idx"
  ON "ironboard_crm_contacts"("tenant_id", "industry_sector");
