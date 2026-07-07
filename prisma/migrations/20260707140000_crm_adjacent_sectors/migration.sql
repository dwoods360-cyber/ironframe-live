-- CreateEnum
CREATE TYPE "IronboardAdjacentSector" AS ENUM (
  'CREDIT_UNION',
  'REGIONAL_INSURANCE',
  'HIGHER_ED',
  'PE_PORTFOLIO_OPS',
  'CRITICAL_INFRA_ADJACENT'
);

-- AlterEnum
ALTER TYPE "IronboardLeadIngestionSource" ADD VALUE 'PARTNER_REFERRAL';

-- AlterTable
ALTER TABLE "ironboard_crm_contacts" ADD COLUMN "adjacent_sector" "IronboardAdjacentSector";

-- CreateIndex
CREATE INDEX "ironboard_crm_contacts_tenant_id_adjacent_sector_idx" ON "ironboard_crm_contacts"("tenant_id", "adjacent_sector");
