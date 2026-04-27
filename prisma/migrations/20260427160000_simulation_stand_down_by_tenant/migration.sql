-- Per-tenant stand-down map after board purge (prevents automated re-inject during window).
ALTER TABLE "simulation_config"
ADD COLUMN IF NOT EXISTS "simulation_stand_down_expires_at_by_tenant" JSONB NOT NULL DEFAULT '{}'::jsonb;
