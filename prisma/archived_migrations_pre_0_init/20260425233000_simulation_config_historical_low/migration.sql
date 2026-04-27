-- Board Report: track worst-ever operational readiness score + when it was set
ALTER TABLE "simulation_config" ADD COLUMN "historical_lowest_score" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "simulation_config" ADD COLUMN "historical_lowest_recorded_at" TIMESTAMP(3);
