-- Run this in Supabase SQL Editor to add companies.tenantId and FK to tenants.
-- Use when prisma db push / migrate deploy cannot be used (e.g. extra DB objects or migration history mismatch).

-- Add column and strict FK (fails if column already exists; then run only the index if needed)
ALTER TABLE "companies" ADD COLUMN "tenantId" UUID NULL;

ALTER TABLE "companies"
  ADD CONSTRAINT "companies_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "companies_tenantId_idx" ON "companies"("tenantId");
