-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "is_test_record" BOOLEAN NOT NULL DEFAULT false;
