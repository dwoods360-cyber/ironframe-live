-- Repair: Supabase / prod DBs where prior migrations never applied (Prisma P2022 missing columns).
-- Safe to re-run: every statement uses IF NOT EXISTS.

ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "autonomous_carbon_mitigation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "self_healing_active_since" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_live_api_degraded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_api_degraded_since" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_stale_lockdown_waived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_stale_lockdown_witness_at" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "state_freeze_escalated_at" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "state_freeze_voice_dispatched_at" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_api_heartbeat_failures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_api_last_heartbeat_at" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "ironwatch_stale_data_notified_at" TIMESTAMP(3);
