-- Board report premium engine history persistence
ALTER TABLE "daily_snapshots" ADD COLUMN "premium_cents" BIGINT NOT NULL DEFAULT 0;
