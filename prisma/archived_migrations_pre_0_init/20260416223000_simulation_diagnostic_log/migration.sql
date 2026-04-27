-- Section 4.3: shadow-only simulation diagnostic trail (no production ThreatEvent bleed)
CREATE TABLE "SimulationDiagnosticLog" (
    "id" TEXT NOT NULL,
    "tenantUuid" UUID NOT NULL,
    "simThreatId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationDiagnosticLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SimulationDiagnosticLog_tenantUuid_createdAt_idx" ON "SimulationDiagnosticLog"("tenantUuid", "createdAt");
CREATE INDEX "SimulationDiagnosticLog_simThreatId_idx" ON "SimulationDiagnosticLog"("simThreatId");
