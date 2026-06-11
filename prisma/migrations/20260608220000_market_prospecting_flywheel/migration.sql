-- IronBoard GTM autonomous prospecting flywheel (platform-level tables).

CREATE TABLE "market_prospects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "employee_count" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "compliance_pressure" TEXT NOT NULL,
    "deal_stage" TEXT NOT NULL,
    "ai_fitness_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_prospects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "market_prospects_domain_key" ON "market_prospects"("domain");
CREATE INDEX "market_prospects_region_ai_fitness_score_idx" ON "market_prospects"("region", "ai_fitness_score");

CREATE TABLE "outreach_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prospect_id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_copy" TEXT NOT NULL,
    "value_proposition" TEXT NOT NULL,

    CONSTRAINT "outreach_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_history_prospect_id_timestamp_idx" ON "outreach_history"("prospect_id", "timestamp");

ALTER TABLE "outreach_history" ADD CONSTRAINT "outreach_history_prospect_id_fkey"
    FOREIGN KEY ("prospect_id") REFERENCES "market_prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "market_intelligence_flywheel_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "component" TEXT NOT NULL DEFAULT 'MARKET_INTELLIGENCE_FLYWHEEL',
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_intelligence_flywheel_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_intelligence_flywheel_logs_timestamp_idx" ON "market_intelligence_flywheel_logs"("timestamp");
