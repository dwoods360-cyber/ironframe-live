-- sync_sustainability_fields: SustainabilityMetric.mitigated_value_cents NOT NULL + default 0 (TAS / Ironbloom JSON-safe ledger)
UPDATE "SustainabilityMetric" SET "mitigated_value_cents" = 0 WHERE "mitigated_value_cents" IS NULL;
ALTER TABLE "SustainabilityMetric" ALTER COLUMN "mitigated_value_cents" SET DEFAULT 0;
ALTER TABLE "SustainabilityMetric" ALTER COLUMN "mitigated_value_cents" SET NOT NULL;
