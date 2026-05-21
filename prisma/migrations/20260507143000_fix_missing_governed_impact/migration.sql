-- =============================================================================
-- fix_missing_governed_impact — SimThreatEvent.governed_impact (Epic 8 ledger)
-- =============================================================================
-- Primary DDL lives in `20260506183259_seal_grc_gold_math`. This migration closes
-- gaps when `governed_impact` is missing entirely or exists as a plain BIGINT from
-- baseline-only snapshots (not GENERATED).
--
-- governed_impact (cents) = (base_impact_cents * governance_impact_multiplier) / 100
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid AND c.relkind = 'r'
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'SimThreatEvent'
      AND a.attname = 'governed_impact'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND COALESCE(a.attgenerated, '') = ''
  ) THEN
    ALTER TABLE "SimThreatEvent" DROP COLUMN "governed_impact";
  END IF;
END $$;

ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "governed_impact" BIGINT GENERATED ALWAYS AS (
  ("base_impact_cents" * "governance_impact_multiplier") / 100
) STORED;

ALTER TABLE "SimThreatEvent" ALTER COLUMN "governed_impact" SET NOT NULL;
