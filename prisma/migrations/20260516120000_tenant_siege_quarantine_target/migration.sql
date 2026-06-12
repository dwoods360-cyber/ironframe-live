-- Agent 6 (Ironlock) + Agent 3 (Irontrust): targeted siege flag + ledger primary tenant for maturity penalties.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "is_under_targeted_siege" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "last_chaos_forensic_hardening_at" TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quarantine_ledger'
  ) THEN
    ALTER TABLE "quarantine_ledger" ADD COLUMN IF NOT EXISTS "primary_target_tenant_uuid" UUID;
    CREATE INDEX IF NOT EXISTS "quarantine_ledger_primary_target_idx" ON "quarantine_ledger" ("primary_target_tenant_uuid");
  END IF;
END $$;
