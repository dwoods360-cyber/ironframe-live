-- Run after part 1 is committed (new enum value visible).

DO $$
DECLARE
  udt text;
BEGIN
  SELECT c.udt_name INTO udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'AgentRegistry'
    AND c.column_name = 'status';

  IF udt IS NOT NULL AND lower(udt) <> 'workforceregistrystatus' THEN
    EXECUTE 'ALTER TABLE "AgentRegistry" ALTER COLUMN "status" DROP DEFAULT';
    EXECUTE $alter$
      ALTER TABLE "AgentRegistry"
      ALTER COLUMN "status" TYPE "WorkforceRegistryStatus"
      USING (
        CASE coalesce(trim("status"::text), '')
          WHEN 'NO_ENTRY' THEN 'NO_ENTRY'::"WorkforceRegistryStatus"
          WHEN 'LKG_VERIFIED' THEN 'LKG_VERIFIED'::"WorkforceRegistryStatus"
          WHEN 'DRIFT_DETECTED' THEN 'DRIFT_DETECTED'::"WorkforceRegistryStatus"
          WHEN 'RE_VERIFICATION_REQUIRED' THEN 'RE_VERIFICATION_REQUIRED'::"WorkforceRegistryStatus"
          ELSE 'LKG_VERIFIED'::"WorkforceRegistryStatus"
        END
      );
    $alter$;
    EXECUTE $def$
      ALTER TABLE "AgentRegistry"
      ALTER COLUMN "status" SET DEFAULT 'LKG_VERIFIED'::"WorkforceRegistryStatus"
    $def$;
  END IF;
END $$;

UPDATE "AgentRegistry"
SET status = 'RE_VERIFICATION_REQUIRED'::"WorkforceRegistryStatus"
WHERE status::text = 'DRIFT_DETECTED';
