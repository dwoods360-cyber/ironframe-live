ALTER TABLE "ThreatEvent"
ADD COLUMN "financialRisk_cents" BIGINT NOT NULL DEFAULT 0;

UPDATE "ThreatEvent"
SET "financialRisk_cents" = ROUND(COALESCE("financialRiskM", 0) * 100000000)::BIGINT;

ALTER TABLE "ThreatEvent"
DROP COLUMN "financialRiskM";
