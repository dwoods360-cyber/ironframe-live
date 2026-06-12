-- Quarantine ledger (Ironguard recidivism + Ironlock hard ban).
-- Includes columns added in earlier-dated migrations (151950, 161200) for shadow DB replay order.

CREATE TABLE IF NOT EXISTS "quarantine_ledger" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "offense_count" INTEGER NOT NULL DEFAULT 1,
    "is_hard_ban" BOOLEAN NOT NULL DEFAULT false,
    "last_violation_at" TIMESTAMP(3) NOT NULL,
    "reset_by_human_id" UUID,
    "probation_hold_active" BOOLEAN NOT NULL DEFAULT true,
    "forensic_justification" TEXT,
    "primary_target_tenant_uuid" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarantine_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quarantine_ledger_identifier_key" ON "quarantine_ledger"("identifier");
CREATE INDEX IF NOT EXISTS "quarantine_ledger_identifier_idx" ON "quarantine_ledger"("identifier");
CREATE INDEX IF NOT EXISTS "quarantine_ledger_primary_target_idx" ON "quarantine_ledger" ("primary_target_tenant_uuid");
