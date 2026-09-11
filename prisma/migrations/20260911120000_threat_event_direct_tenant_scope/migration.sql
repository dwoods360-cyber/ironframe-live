-- Gate 2: make the production threat ledger independently tenant-scoped.
-- Existing rows are backfilled only from their owning Company; ambiguous or
-- unowned rows abort the migration rather than being assigned to a guessed tenant.

BEGIN;

ALTER TABLE "ThreatEvent" ADD COLUMN "tenant_id" UUID;

-- ThreatEvent may be protected by the optional WORM trigger in long-lived
-- sessions. This transaction-scoped bypass permits only this controlled backfill.
SET LOCAL app.worm_threat_event_bypass = '1';

UPDATE "ThreatEvent" AS threat
SET "tenant_id" = company."tenantId"
FROM "companies" AS company
WHERE threat."tenantCompanyId" = company."id";

DO $$
DECLARE
  unresolved_count bigint;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM "ThreatEvent"
  WHERE "tenant_id" IS NULL;

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION
      'ThreatEvent tenant backfill failed: % row(s) have no resolvable owning Company',
      unresolved_count;
  END IF;
END
$$;

ALTER TABLE "ThreatEvent" ALTER COLUMN "tenant_id" SET NOT NULL;

CREATE INDEX "ThreatEvent_tenant_id_idx" ON "ThreatEvent"("tenant_id");

ALTER TABLE "ThreatEvent"
  ADD CONSTRAINT "ThreatEvent_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- tenantCompanyId remains optional for system-originated events, but whenever it
-- is present it must belong to the same tenant stamped on the threat row.
CREATE OR REPLACE FUNCTION ironguard_validate_threat_event_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."tenantCompanyId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "companies" AS company
    WHERE company."id" = NEW."tenantCompanyId"
      AND company."tenantId" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION
      'ThreatEvent tenant mismatch: company % does not belong to tenant %',
      NEW."tenantCompanyId", NEW."tenant_id";
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ironguard_validate_threat_event_tenant_trigger
  BEFORE INSERT OR UPDATE OF "tenantCompanyId", "tenant_id" ON "ThreatEvent"
  FOR EACH ROW
  EXECUTE FUNCTION ironguard_validate_threat_event_tenant();

COMMIT;
