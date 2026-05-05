-- One-time repair (run as whole script; split into two transactions if ADD VALUE + USE fails).

DO $$
BEGIN
  CREATE TYPE "WorkforceRegistryStatus" AS ENUM ('NO_ENTRY', 'LKG_VERIFIED', 'DRIFT_DETECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "WorkforceRegistryStatus" ADD VALUE 'RE_VERIFICATION_REQUIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
