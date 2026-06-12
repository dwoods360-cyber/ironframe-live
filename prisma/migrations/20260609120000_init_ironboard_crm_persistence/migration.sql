-- Ironboard CRM persistence (tenant-scoped contacts, deals, interactions).
-- Monetary values: BIGINT whole cents. All rows require tenant_id.

CREATE TYPE "IronboardLeadStage" AS ENUM (
  'PROSPECT',
  'QUALIFIED',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST'
);

CREATE TYPE "IronboardInteractionChannel" AS ENUM (
  'EMAIL',
  'CALL',
  'MEETING',
  'LINKEDIN',
  'NOTE',
  'OTHER'
);

CREATE TABLE "ironboard_crm_contacts" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "full_name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "phone" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ironboard_crm_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ironboard_crm_deals" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "stage" "IronboardLeadStage" NOT NULL DEFAULT 'PROSPECT',
  "value_cents" BIGINT NOT NULL DEFAULT 0,
  "primary_contact_id" UUID NOT NULL,
  "account_domain" TEXT,
  "owner_agent_id" TEXT,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ironboard_crm_deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ironboard_crm_interactions" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "deal_id" UUID,
  "contact_id" UUID,
  "channel" "IronboardInteractionChannel" NOT NULL,
  "summary" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ironboard_crm_interactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ironboard_crm_contacts_tenant_id_idx" ON "ironboard_crm_contacts"("tenant_id");
CREATE INDEX "ironboard_crm_contacts_tenant_id_email_idx" ON "ironboard_crm_contacts"("tenant_id", "email");
CREATE INDEX "ironboard_crm_deals_tenant_id_stage_idx" ON "ironboard_crm_deals"("tenant_id", "stage");
CREATE INDEX "ironboard_crm_deals_primary_contact_id_idx" ON "ironboard_crm_deals"("primary_contact_id");
CREATE INDEX "ironboard_crm_interactions_tenant_id_occurred_at_idx" ON "ironboard_crm_interactions"("tenant_id", "occurred_at");
CREATE INDEX "ironboard_crm_interactions_deal_id_idx" ON "ironboard_crm_interactions"("deal_id");
CREATE INDEX "ironboard_crm_interactions_contact_id_idx" ON "ironboard_crm_interactions"("contact_id");

ALTER TABLE "ironboard_crm_contacts"
  ADD CONSTRAINT "ironboard_crm_contacts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ironboard_crm_deals"
  ADD CONSTRAINT "ironboard_crm_deals_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ironboard_crm_deals"
  ADD CONSTRAINT "ironboard_crm_deals_primary_contact_id_fkey"
  FOREIGN KEY ("primary_contact_id") REFERENCES "ironboard_crm_contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ironboard_crm_interactions"
  ADD CONSTRAINT "ironboard_crm_interactions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ironboard_crm_interactions"
  ADD CONSTRAINT "ironboard_crm_interactions_deal_id_fkey"
  FOREIGN KEY ("deal_id") REFERENCES "ironboard_crm_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ironboard_crm_interactions"
  ADD CONSTRAINT "ironboard_crm_interactions_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "ironboard_crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
