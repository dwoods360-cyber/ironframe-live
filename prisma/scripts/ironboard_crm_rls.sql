-- Ironboard CRM tenant boundaries — Ironguard GUC (app.current_tenant_id).
-- Call SELECT ironguard_set_session_tenant('<tenant-uuid>'::uuid) at transaction start before CRM DML.

ALTER TABLE "ironboard_crm_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ironboard_crm_deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ironboard_crm_interactions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS b2b_contact_tenant_isolation ON "ironboard_crm_contacts";
DROP POLICY IF EXISTS deal_record_tenant_isolation ON "ironboard_crm_deals";
DROP POLICY IF EXISTS interaction_log_tenant_isolation ON "ironboard_crm_interactions";
DROP POLICY IF EXISTS tenant_access_base_ironboard_crm_contacts ON "ironboard_crm_contacts";
DROP POLICY IF EXISTS tenant_access_base_ironboard_crm_deals ON "ironboard_crm_deals";
DROP POLICY IF EXISTS tenant_access_base_ironboard_crm_interactions ON "ironboard_crm_interactions";

-- PostgreSQL requires a PERMISSIVE policy before RESTRICTIVE policies can
-- grant rows. The tenant restriction below is ANDed with this neutral base.
CREATE POLICY tenant_access_base_ironboard_crm_contacts ON "ironboard_crm_contacts"
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY tenant_access_base_ironboard_crm_deals ON "ironboard_crm_deals"
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY tenant_access_base_ironboard_crm_interactions ON "ironboard_crm_interactions"
  AS PERMISSIVE FOR ALL USING (true) WITH CHECK (true);

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
