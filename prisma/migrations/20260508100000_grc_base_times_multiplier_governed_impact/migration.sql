-- Immutable math: governed_impact = base_impact_cents * governance_impact_multiplier / 100
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "governance_impact_multiplier" BIGINT NOT NULL DEFAULT 100;

UPDATE "SimThreatEvent"
SET "governance_impact_multiplier" = CASE WHEN "governance_defense_sector" THEN 160 ELSE 100 END;

ALTER TABLE "SimThreatEvent" DROP COLUMN IF EXISTS "governed_impact";

ALTER TABLE "SimThreatEvent" RENAME COLUMN "ale_baseline_cents" TO "base_impact_cents";

ALTER TABLE "SimThreatEvent" DROP COLUMN IF EXISTS "governance_defense_sector";

ALTER TABLE "SimThreatEvent" ADD COLUMN "governed_impact" BIGINT GENERATED ALWAYS AS (
  ("base_impact_cents" * "governance_impact_multiplier") / 100
) STORED;

CREATE OR REPLACE FUNCTION simthreat_sync_ale_baseline() RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW."governance_impact_multiplier", 100) = 100
     AND COALESCE(NEW."base_impact_cents", 0) = 0 THEN
    NEW."base_impact_cents" := COALESCE(NEW."financialRisk_cents", 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_simthreat_sync_ale_baseline ON "SimThreatEvent";
CREATE TRIGGER trg_simthreat_sync_ale_baseline
  BEFORE INSERT OR UPDATE OF "financialRisk_cents", "base_impact_cents", "governance_impact_multiplier"
  ON "SimThreatEvent"
  FOR EACH ROW
  EXECUTE PROCEDURE simthreat_sync_ale_baseline();
