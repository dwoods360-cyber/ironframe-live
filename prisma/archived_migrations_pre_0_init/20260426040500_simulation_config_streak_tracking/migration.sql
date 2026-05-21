-- Compliance streak + all-time best tracking
ALTER TABLE "simulation_config"
  ADD COLUMN "current_streak" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "longest_streak" INTEGER NOT NULL DEFAULT 0;
