-- Epic 11: compliance framework + mapped controls on shadow RiskEvent table (`SimThreatEvent`).
CREATE TYPE "ComplianceFramework" AS ENUM ('SOC2', 'ISO27001', 'NIST');

ALTER TABLE "SimThreatEvent" ADD COLUMN "complianceFramework" "ComplianceFramework" NOT NULL DEFAULT 'SOC2';
ALTER TABLE "SimThreatEvent" ADD COLUMN "mappedControls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "SimThreatEvent_complianceFramework_idx" ON "SimThreatEvent"("complianceFramework");
