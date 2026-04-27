-- Compliance certificate latch on global simulation config
ALTER TABLE "simulation_config" ADD COLUMN "is_certified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "simulation_config" ADD COLUMN "certified_at" TIMESTAMP(3);
