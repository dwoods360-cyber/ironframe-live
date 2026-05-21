-- Analytics purification: contextual exclusion controls
ALTER TABLE "streak_failure_logs"
  ADD COLUMN "is_excluded_from_analytics" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "exclusion_reason" VARCHAR(256);
