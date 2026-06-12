-- Ironwatch (Agent 15): system health log + sustainability API degraded flags

ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_live_api_degraded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_api_heartbeat_failures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "sustainability_api_last_heartbeat_at" TIMESTAMP(3);
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "ironwatch_stale_data_notified_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "system_health_log" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service_key" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "http_status" INTEGER,
    "latency_ms" INTEGER NOT NULL,
    "detail" TEXT,
    "meta" JSONB,

    CONSTRAINT "system_health_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "system_health_log_service_key_created_at_idx" ON "system_health_log"("service_key", "created_at");
