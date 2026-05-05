-- Ironscout TTL expiry label + enum member for re-verification (amber).

DO $$
BEGIN
  ALTER TYPE "WorkforceRegistryStatus" ADD VALUE 'RE_VERIFICATION_REQUIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

UPDATE "AgentRegistry"
SET status = 'RE_VERIFICATION_REQUIRED'::"WorkforceRegistryStatus"
WHERE status::text = 'DRIFT_DETECTED';
