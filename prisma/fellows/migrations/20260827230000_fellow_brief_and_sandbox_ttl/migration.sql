-- Soft commercial bridge + sandbox TTL
ALTER TABLE "academic_fellows"."fellows"
  ADD COLUMN IF NOT EXISTS "request_architecture_brief" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "academic_fellows"."fellows"
  ADD COLUMN IF NOT EXISTS "sandbox_expires_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "fellows_sandbox_expires_at_idx"
  ON "academic_fellows"."fellows"("sandbox_expires_at");

CREATE INDEX IF NOT EXISTS "fellows_request_architecture_brief_idx"
  ON "academic_fellows"."fellows"("request_architecture_brief");
