-- QuarantineLedger: forensic rationale for governed resets (Agents 6 & 19).
-- Guard: table is created in 20260516233000 (later timestamp); column included there for shadow replay.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quarantine_ledger'
  ) THEN
    ALTER TABLE "quarantine_ledger" ADD COLUMN IF NOT EXISTS "forensic_justification" TEXT;
  END IF;
END $$;
