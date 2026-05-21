-- Bot test disposition / receipt ledger (forensic chassis)
CREATE TABLE "BotAuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "botType" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "operator" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "BotAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotAuditLog_createdAt_idx" ON "BotAuditLog"("createdAt");
CREATE INDEX "BotAuditLog_tenantId_idx" ON "BotAuditLog"("tenantId");
CREATE INDEX "BotAuditLog_botType_idx" ON "BotAuditLog"("botType");
