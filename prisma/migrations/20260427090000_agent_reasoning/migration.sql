-- CreateTable
CREATE TABLE "agent_reasoning" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_id" TEXT NOT NULL,
    "threat_id" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "agent_reasoning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_reasoning_agent_id_threat_id_key" ON "agent_reasoning"("agent_id", "threat_id");

-- CreateIndex
CREATE INDEX "agent_reasoning_threat_id_idx" ON "agent_reasoning"("threat_id");

-- AddForeignKey
ALTER TABLE "agent_reasoning" ADD CONSTRAINT "agent_reasoning_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
