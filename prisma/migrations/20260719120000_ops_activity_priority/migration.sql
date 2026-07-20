-- Priority rank for Ops Calendar (1 = highest). Used for P1/P2… badges.
ALTER TABLE "ops_activities" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 50;
CREATE INDEX IF NOT EXISTS "ops_activities_priority_idx" ON "ops_activities"("priority");
