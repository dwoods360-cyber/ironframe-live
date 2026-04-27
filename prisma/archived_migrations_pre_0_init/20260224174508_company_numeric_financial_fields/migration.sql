-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('CRITICAL', 'HIGH', 'MED', 'LOW');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'THINKING', 'ERROR');

-- CreateTable
CREATE TABLE "companies" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "industry_avg_loss" DOUBLE PRECISION,
    "infrastructure_val" DOUBLE PRECISION,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_scan" TEXT NOT NULL DEFAULT 'Today',

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_risks" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "active_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "risk_tier" "RiskTier" NOT NULL DEFAULT 'LOW',
    "parent_id" BIGINT,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_risks" ADD CONSTRAINT "active_risks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
