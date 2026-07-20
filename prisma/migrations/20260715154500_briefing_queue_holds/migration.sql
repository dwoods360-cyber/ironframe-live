-- Ops Hub hold desk — park quarantined drafts for later reading without Approve or Deny.
CREATE TABLE IF NOT EXISTS "briefing_queue_holds" (
    "filename" TEXT NOT NULL,
    "note" TEXT,
    "held_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "briefing_queue_holds_pkey" PRIMARY KEY ("filename")
);
