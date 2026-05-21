-- Irontech Epic 6: AgentOperation + Retry-3 / Phone Home persistence

CREATE TYPE "AgentOperationStatus" AS ENUM (
  'PENDING',
  'RETRYING',
  'FAILED',
  'COMPLETED',
  'ESCALATED',
  'EXTERNALLY_RESOLVED'
);

CREATE TABLE "AgentOperation" (
    "id" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" "AgentOperationStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentOperation_threatId_agentName_key" ON "AgentOperation"("threatId", "agentName");
CREATE INDEX "AgentOperation_threatId_idx" ON "AgentOperation"("threatId");
CREATE INDEX "AgentOperation_status_idx" ON "AgentOperation"("status");

ALTER TABLE "AgentOperation" ADD CONSTRAINT "AgentOperation_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
