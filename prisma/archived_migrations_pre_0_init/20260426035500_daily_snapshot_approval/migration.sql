-- Board commentary sign-off workflow
ALTER TABLE "daily_snapshots"
  ADD COLUMN "is_approved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approved_by" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3);
