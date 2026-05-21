-- Force-Seal the Governed Impact logic into Postgres 18 hardware
-- This ensures the 1.6x Defense Multiplier is immutable at the DB layer.

ALTER TABLE "SimThreatEvent" DROP COLUMN IF EXISTS "governed_impact";

ALTER TABLE "SimThreatEvent" ADD COLUMN "governed_impact" BIGINT 
GENERATED ALWAYS AS (("base_impact_cents" * "governance_impact_multiplier") / 100) STORED;