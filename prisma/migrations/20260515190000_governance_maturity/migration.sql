-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "governance_maturity" JSONB;
