-- Epic 16 / nightly narrate: Governance Frame Triad snapshot cache for IronBoard ingestion.

CREATE TABLE "governance_frame_triad_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "operational_date" DATE NOT NULL,
    "exposure_vector" TEXT NOT NULL,
    "impact_summary" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,
    "narrative_markdown" TEXT,
    "source_telemetry_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governance_frame_triad_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "governance_frame_triad_snapshots_tenant_id_operational_date_key"
    ON "governance_frame_triad_snapshots"("tenant_id", "operational_date");

CREATE INDEX "governance_frame_triad_snapshots_tenant_id_operational_date_idx"
    ON "governance_frame_triad_snapshots"("tenant_id", "operational_date");

ALTER TABLE "governance_frame_triad_snapshots"
    ADD CONSTRAINT "governance_frame_triad_snapshots_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
