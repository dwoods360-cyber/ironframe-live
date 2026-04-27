-- Epic 4.3: shadow-plane threat rows for simulation ingress (no FKs to ThreatEvent children).

CREATE TABLE "SimThreatEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceAgent" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "financialRisk_cents" BIGINT NOT NULL DEFAULT 0,
    "tenantCompanyId" BIGINT,
    "status" "ThreatState" NOT NULL DEFAULT 'PIPELINE',
    "remote_tech_id" TEXT,
    "remoteAccessAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "ttlSeconds" INTEGER NOT NULL DEFAULT 259200,
    "deAckReason" "DeAckReason",
    "assignee_id" TEXT,
    "aiReport" TEXT,
    "ingestionDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimThreatEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SimThreatEvent_tenantCompanyId_idx" ON "SimThreatEvent"("tenantCompanyId");
