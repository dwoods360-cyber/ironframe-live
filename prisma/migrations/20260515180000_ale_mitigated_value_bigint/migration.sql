-- Epic 9 / Agent 18: native BIGINT mitigated_value_cents (financial + sustainability ALE)
-- Backfill from SustainabilityMetric and legacy JSON audit metadata without precision loss.

ALTER TABLE "ThreatEvent" ADD COLUMN IF NOT EXISTS "mitigated_value_cents" BIGINT;
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "mitigated_value_cents" BIGINT;

-- Sustainability ledger → threat row
UPDATE "ThreatEvent" t
SET "mitigated_value_cents" = s."mitigated_value_cents"
FROM "SustainabilityMetric" s
WHERE s."threatId" = t.id
  AND s."mitigated_value_cents" IS NOT NULL
  AND t."mitigated_value_cents" IS NULL;

-- Bot audit JSON metadata → threat row (string cents only)
UPDATE "ThreatEvent" t
SET "mitigated_value_cents" = (b.metadata->>'mitigatedValueCents')::bigint
FROM "BotAuditLog" b
WHERE b.metadata ? 'mitigatedValueCents'
  AND (b.metadata->>'mitigatedValueCents') ~ '^[0-9]+$'
  AND b.metadata->>'threatId' = t.id
  AND t."mitigated_value_cents" IS NULL;

-- Financial ALE fallback where no sustainability row exists yet
UPDATE "ThreatEvent"
SET "mitigated_value_cents" = "financialRisk_cents"
WHERE "mitigated_value_cents" IS NULL
  AND "financialRisk_cents" > 0;

-- Shadow plane: mirror financial ALE when mitigated column empty
UPDATE "SimThreatEvent"
SET "mitigated_value_cents" = COALESCE("mitigated_value_cents", "financialRisk_cents", "governed_impact")
WHERE "mitigated_value_cents" IS NULL;
