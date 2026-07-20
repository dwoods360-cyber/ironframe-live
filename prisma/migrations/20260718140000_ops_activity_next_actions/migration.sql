-- Action checklist for open calendar items (newline-separated).
ALTER TABLE "ops_activities" ADD COLUMN IF NOT EXISTS "next_actions" TEXT;
