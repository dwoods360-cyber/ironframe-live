/*
  Warnings:

  - Made the column `governed_impact` on table `SimThreatEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SimThreatEvent" ALTER COLUMN "governed_impact" SET NOT NULL;
