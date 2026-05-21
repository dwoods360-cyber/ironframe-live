-- QuarantineLedger: forensic rationale for governed resets (Agents 6 & 19).
ALTER TABLE "quarantine_ledger" ADD COLUMN IF NOT EXISTS "forensic_justification" TEXT;
