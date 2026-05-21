-- GRC: disposition + digital receipt anchor (twins: ThreatEvent / SimThreatEvent)
ALTER TABLE "ThreatEvent" ADD COLUMN IF NOT EXISTS "is_false_positive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ThreatEvent" ADD COLUMN IF NOT EXISTS "disposition_status" TEXT;
ALTER TABLE "ThreatEvent" ADD COLUMN IF NOT EXISTS "receipt_hash" TEXT;

ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "is_false_positive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "disposition_status" TEXT;
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "receipt_hash" TEXT;
