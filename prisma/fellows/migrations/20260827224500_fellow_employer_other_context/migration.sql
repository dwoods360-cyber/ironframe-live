-- Required employer context: OTHER + free-text employment_context
ALTER TYPE "academic_fellows"."FellowEmployerType" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TABLE "academic_fellows"."fellows"
  ADD COLUMN IF NOT EXISTS "employment_context" TEXT;
