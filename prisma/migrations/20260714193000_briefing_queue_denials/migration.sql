-- Ops Hub approve/deny desk for quarantined Governance Frame / Ironcast drafts.
CREATE TABLE IF NOT EXISTS "briefing_queue_denials" (
    "filename" TEXT NOT NULL,
    "reason" TEXT,
    "denied_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefing_queue_denials_pkey" PRIMARY KEY ("filename")
);
