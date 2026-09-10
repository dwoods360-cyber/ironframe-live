-- Fellow sessions require proof of mailbox ownership. Raw tokens are never stored.
ALTER TABLE "academic_fellows"."fellows"
  ADD COLUMN "access_token_hash" TEXT,
  ADD COLUMN "access_token_expires_at" TIMESTAMP(3),
  ADD COLUMN "access_token_consumed_at" TIMESTAMP(3),
  ADD COLUMN "access_token_requested_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "fellows_access_token_hash_key"
  ON "academic_fellows"."fellows"("access_token_hash");

CREATE INDEX "fellows_access_token_expires_at_idx"
  ON "academic_fellows"."fellows"("access_token_expires_at");
