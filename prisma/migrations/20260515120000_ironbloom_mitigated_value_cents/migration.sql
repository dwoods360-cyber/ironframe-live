-- Ironbloom Gridcore: sealed physical-to-financial translation column
ALTER TABLE "SustainabilityMetric" ADD COLUMN IF NOT EXISTS "mitigated_value_cents" BIGINT;
