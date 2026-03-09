-- Add strict tenant FK to companies (Iteration 1.1)
ALTER TABLE "companies" ADD COLUMN "tenantId" UUID NULL;
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "companies_tenantId_idx" ON "companies"("tenantId");
