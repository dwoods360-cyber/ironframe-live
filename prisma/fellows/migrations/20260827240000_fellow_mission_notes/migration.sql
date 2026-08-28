-- Short mission notes + opt-in for anonymous product Eyes review (never Path B auto-lead)
ALTER TABLE "academic_fellows"."fellows"
  ADD COLUMN IF NOT EXISTS "notes_product_improvement_consent" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "fellows_notes_product_improvement_consent_idx"
  ON "academic_fellows"."fellows"("notes_product_improvement_consent");

ALTER TABLE "academic_fellows"."fellow_missions"
  ADD COLUMN IF NOT EXISTS "methodology_notes" TEXT;

ALTER TABLE "academic_fellows"."fellow_missions"
  ADD COLUMN IF NOT EXISTS "notes_saved_at" TIMESTAMP(3);
