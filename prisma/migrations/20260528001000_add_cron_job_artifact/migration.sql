CREATE TABLE IF NOT EXISTS "cron_job_artifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "agentName" TEXT NOT NULL,
  "runTimestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "payloadJson" JSONB,
  "blobUrl" TEXT,
  "metricValue" BIGINT,
  "metricUnit" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "cron_job_artifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cron_job_artifact_tenantId_agentName_idx"
  ON "cron_job_artifact" ("tenantId", "agentName");

CREATE INDEX IF NOT EXISTS "cron_job_artifact_runTimestamp_idx"
  ON "cron_job_artifact" ("runTimestamp");
