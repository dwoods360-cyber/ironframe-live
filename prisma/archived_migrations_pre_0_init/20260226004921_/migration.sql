/*
  Warnings:

  - You are about to drop the column `score` on the `active_risks` table. All the data in the column will be lost.
  - The primary key for the `vendors` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `company_id` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `parent_id` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `risk_tier` on the `vendors` table. All the data in the column will be lost.
  - Added the required column `score_cents` to the `active_risks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `vendors` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_company_id_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_parent_id_fkey";

-- AlterTable
ALTER TABLE "active_risks" DROP COLUMN "score",
ADD COLUMN     "score_cents" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_pkey",
DROP COLUMN "company_id",
DROP COLUMN "parent_id",
DROP COLUMN "risk_tier",
ADD COLUMN     "riskTier" TEXT NOT NULL DEFAULT 'LOW',
ADD COLUMN     "tenantId" UUID NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "vendors_id_seq";

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'Secure Enclave',
    "ale_baseline" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Failed_Jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error_state" JSONB NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Failed_Jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ironscout_Tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "target_url" TEXT NOT NULL,
    "directive" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ironscout_Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "Failed_Jobs_tenant_id_idx" ON "Failed_Jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "Failed_Jobs_status_idx" ON "Failed_Jobs"("status");

-- CreateIndex
CREATE INDEX "Ironscout_Tasks_tenant_id_idx" ON "Ironscout_Tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "Ironscout_Tasks_expires_at_idx" ON "Ironscout_Tasks"("expires_at");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
