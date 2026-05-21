ALTER TABLE "GovernedSession" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
CREATE INDEX IF NOT EXISTS "GovernedSession_tenant_id_idx" ON "GovernedSession"("tenant_id");
