-- Ironlock global security freeze + Ironguard violation ledger (Ironwatch circuit breaker / Ironscribe synthesis).

ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "state_freeze_active" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ironguard_violation" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_tenant_uuid" UUID,
    "attempted_tenant_uuid" UUID,
    "error_code" TEXT NOT NULL,
    "path" VARCHAR(1024),
    "metadata" JSONB,

    CONSTRAINT "ironguard_violation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ironguard_violation_created_at_idx" ON "ironguard_violation"("created_at");
