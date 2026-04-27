-- Elite resilience operator badge tracking
ALTER TABLE "simulation_config"
  ADD COLUMN "successful_grace_recoveries" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "is_elite_operator" BOOLEAN NOT NULL DEFAULT false;
