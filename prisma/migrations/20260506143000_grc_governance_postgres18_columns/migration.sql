-- GRC Gold: baseline cents, Defense flag, governance hash, Postgres generated governed_impact.
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "governance_defense_sector" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "ale_baseline_cents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "SimThreatEvent" ADD COLUMN IF NOT EXISTS "governance_hash" TEXT;

-- Approximate backfill: treat existing financialRisk_cents as baseline; no Defense flag → governed_impact matches prior exposure.
UPDATE "SimThreatEvent" SET "ale_baseline_cents" = "financialRisk_cents" WHERE "ale_baseline_cents" = 0;

ALTER TABLE "SimThreatEvent" DROP COLUMN IF EXISTS "governed_impact";
ALTER TABLE "SimThreatEvent" ADD COLUMN "governed_impact" BIGINT GENERATED ALWAYS AS (
  CASE
    WHEN "governance_defense_sector" THEN ("ale_baseline_cents" * 16) / 10
    ELSE "ale_baseline_cents"
  END
) STORED;

-- When Defense governance is off and baseline was left at 0, mirror financialRisk_cents so governed_impact stays aligned.
CREATE OR REPLACE FUNCTION simthreat_sync_ale_baseline() RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW."governance_defense_sector", false) IS NOT TRUE
     AND COALESCE(NEW."ale_baseline_cents", 0) = 0 THEN
    NEW."ale_baseline_cents" := COALESCE(NEW."financialRisk_cents", 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_simthreat_sync_ale_baseline ON "SimThreatEvent";
CREATE TRIGGER trg_simthreat_sync_ale_baseline
  BEFORE INSERT OR UPDATE OF "financialRisk_cents", "ale_baseline_cents", "governance_defense_sector"
  ON "SimThreatEvent"
  FOR EACH ROW
  EXECUTE PROCEDURE simthreat_sync_ale_baseline();
