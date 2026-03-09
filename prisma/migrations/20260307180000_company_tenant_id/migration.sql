-- AlterTable: add optional tenant scoping to companies for dashboard tenant isolation (Iteration 1.1)
ALTER TABLE "companies" ADD COLUMN "tenantId" UUID NULL;

-- Add FK to tenants (SetNull on delete so existing data is not broken)
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for tenant-filtered queries
CREATE INDEX "companies_tenantId_idx" ON "companies"("tenantId");
