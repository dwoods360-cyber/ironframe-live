-- AlterTable
ALTER TABLE "active_risks" ADD COLUMN IF NOT EXISTS "isSimulation" BOOLEAN NOT NULL DEFAULT false;
