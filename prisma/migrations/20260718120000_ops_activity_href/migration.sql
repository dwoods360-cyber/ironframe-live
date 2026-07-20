-- Calendar cards always carry a clickable destination.
ALTER TABLE "ops_activities" ADD COLUMN IF NOT EXISTS "href" TEXT;
