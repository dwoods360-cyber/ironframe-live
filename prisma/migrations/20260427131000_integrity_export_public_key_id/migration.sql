ALTER TABLE "integrity_exports"
ADD COLUMN IF NOT EXISTS "public_key_id" TEXT;

UPDATE "integrity_exports"
SET "public_key_id" = 'legacy-hmac'
WHERE "public_key_id" IS NULL;

ALTER TABLE "integrity_exports"
ALTER COLUMN "public_key_id" SET NOT NULL;
