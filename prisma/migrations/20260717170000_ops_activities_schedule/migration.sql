-- Ops Hub Schedule — due-dated editorial/ops activities with T-3/T-2/T-1 reminders.

CREATE TYPE "OpsActivityKind" AS ENUM (
  'BRIEFING_OUTLINE',
  'BRIEFING_DRAFT',
  'BRIEFING_REVIEW',
  'NEWSLETTER_DRAFT',
  'NEWSLETTER_REVIEW',
  'NEWSLETTER_SYNDICATE',
  'RESEARCH_PAPER',
  'OPS_GENERAL'
);

CREATE TYPE "OpsActivityStatus" AS ENUM (
  'PLANNED',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'CANCELLED'
);

CREATE TABLE IF NOT EXISTS "ops_activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "OpsActivityKind" NOT NULL,
    "status" "OpsActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "due_at" TIMESTAMP(3) NOT NULL,
    "owner_label" TEXT NOT NULL DEFAULT 'Ops',
    "source_ref" TEXT,
    "notes" TEXT,
    "reminders_sent" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ops_activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ops_activities_due_at_status_idx" ON "ops_activities"("due_at", "status");
CREATE INDEX IF NOT EXISTS "ops_activities_source_ref_idx" ON "ops_activities"("source_ref");
CREATE INDEX IF NOT EXISTS "ops_activities_status_idx" ON "ops_activities"("status");
