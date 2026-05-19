-- CreateEnum
CREATE TYPE "SecurityPosture" AS ENUM ('DUAL_LOCK', 'TRIPARTITE_LOCK');

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN "security_posture" "SecurityPosture" NOT NULL DEFAULT 'DUAL_LOCK';
ALTER TABLE "SystemConfig" ADD COLUMN "emergency_seal" JSONB;
