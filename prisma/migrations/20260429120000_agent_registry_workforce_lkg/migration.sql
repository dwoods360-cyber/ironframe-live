-- Workforce LKG handshake registry (Integrity Hub inventory + TTL band)

CREATE TYPE "WorkforceRegistryStatus" AS ENUM ('NO_ENTRY', 'LKG_VERIFIED', 'DRIFT_DETECTED');

CREATE TABLE "AgentRegistry" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "last_health_check" TIMESTAMP(3),
    "status" "WorkforceRegistryStatus" NOT NULL DEFAULT 'NO_ENTRY',
    "last_pulse_authority" TEXT,
    "last_pulse_kind" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRegistry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentRegistry_agentName_key" ON "AgentRegistry"("agentName");
