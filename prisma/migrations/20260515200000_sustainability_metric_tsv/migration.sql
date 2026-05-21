-- Total Societal Value (Social Cost of Carbon + internal operational/regulatory ROI cents)
ALTER TABLE "SustainabilityMetric" ADD COLUMN IF NOT EXISTS "total_societal_value_cents" BIGINT;
