-- Financial qualification fields for MarketProspect scoring.

ALTER TABLE "market_prospects" ADD COLUMN "recent_funding" TEXT;
ALTER TABLE "market_prospects" ADD COLUMN "has_compliance_job" BOOLEAN NOT NULL DEFAULT false;
