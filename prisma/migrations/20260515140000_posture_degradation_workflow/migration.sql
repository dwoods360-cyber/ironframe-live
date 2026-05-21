-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "posture_degradation_workflow" JSONB;
