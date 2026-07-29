-- Enclave hierarchy + commercial hard-caps (Path B 1 Primary + ≤2 Subtenants).
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "enclave_role" TEXT NOT NULL DEFAULT 'PRIMARY';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "commercial_tier" TEXT NOT NULL DEFAULT 'PATH_B';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "entitled_subtenant_slots" INTEGER;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "parent_tenant_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_parent_tenant_id_fkey'
  ) THEN
    ALTER TABLE "tenants"
      ADD CONSTRAINT "tenants_parent_tenant_id_fkey"
      FOREIGN KEY ("parent_tenant_id") REFERENCES "tenants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tenants_parent_tenant_id_idx" ON "tenants"("parent_tenant_id");
