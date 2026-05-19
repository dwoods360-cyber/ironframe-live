-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "dead_man_switch" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GovernedSession" (
    "id" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "GovernedSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EntryWitness" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "custodian_role" TEXT NOT NULL,
    "client_ip" TEXT NOT NULL,
    "fingerprint_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryWitness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GovernedSession_session_key_key" ON "GovernedSession"("session_key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EntryWitness_context_custodian_role_idx" ON "EntryWitness"("context", "custodian_role");
