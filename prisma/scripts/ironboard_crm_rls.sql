-- Ironboard CRM tenant boundaries — Ironguard GUC (app.current_tenant_id).
-- Call SELECT ironguard_set_session_tenant('<tenant-uuid>'::uuid) at transaction start before CRM DML.

ALTER TABLE "ironboard_crm_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ironboard_crm_deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ironboard_crm_interactions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS b2b_contact_tenant_isolation ON "ironboard_crm_contacts";
DROP POLICY IF EXISTS deal_record_tenant_isolation ON "ironboard_crm_deals";
DROP POLICY IF EXISTS interaction_log_tenant_isolation ON "ironboard_crm_interactions";

CREATE POLICY b2b_contact_tenant_isolation ON "ironboard_crm_contacts"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY deal_record_tenant_isolation ON "ironboard_crm_deals"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY interaction_log_tenant_isolation ON "ironboard_crm_interactions"
  AS RESTRICTIVE
  FOR ALL
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
