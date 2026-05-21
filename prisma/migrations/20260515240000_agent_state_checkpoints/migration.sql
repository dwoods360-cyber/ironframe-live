-- Irontech Agent 12: LKG checkpoints for autonomous respawn (Tier 2/3)
CREATE TABLE IF NOT EXISTS "agent_state_checkpoints" (
    "id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "state_hash_sha256" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "verified_healthy" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_state_checkpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "agent_state_checkpoints_agent_name_tenant_id_created_at_idx" ON "agent_state_checkpoints"("agent_name", "tenant_id", "created_at");
