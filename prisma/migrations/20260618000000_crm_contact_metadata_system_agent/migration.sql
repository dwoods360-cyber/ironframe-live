-- CRM sales smoke-test alignment: contact metadata JSON + SYSTEM_AGENT channel
ALTER TYPE "IronboardInteractionChannel" ADD VALUE IF NOT EXISTS 'SYSTEM_AGENT';

ALTER TABLE "ironboard_crm_contacts"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
