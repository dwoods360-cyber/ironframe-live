-- Completion / close-out review text for Done and Cancelled calendar items.
ALTER TABLE "ops_activities" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
