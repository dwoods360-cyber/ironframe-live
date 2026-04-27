/*
  Warnings:

  - You are about to drop the column `industry_avg_loss` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `infrastructure_val` on the `companies` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "companies" DROP COLUMN "industry_avg_loss",
DROP COLUMN "infrastructure_val",
ADD COLUMN     "industry_avg_loss_cents" BIGINT,
ADD COLUMN     "infrastructure_val_cents" BIGINT;
