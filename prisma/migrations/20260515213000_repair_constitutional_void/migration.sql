-- repair_constitutional_void (Ironguard Agent 13): idempotent column heal for Ironwatch + self-healing + ledger
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "autonomous_carbon_mitigation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "self_healing_active_since" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_live_api_degraded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_api_degraded_since" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_stale_lockdown_waived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_stale_lockdown_witness_at" TIMESTAMP(3);
ALTER TABLE "SustainabilityMetric" ADD COLUMN IF NOT EXISTS "mitigated_value_cents" BIGINT NOT NULL DEFAULT 0;
