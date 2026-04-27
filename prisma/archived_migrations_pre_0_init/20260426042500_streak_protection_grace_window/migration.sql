-- 50+ day streak protection grace window
ALTER TABLE "simulation_config"
  ADD COLUMN "grace_window_started_at" TIMESTAMP(3),
  ADD COLUMN "grace_window_expires_at" TIMESTAMP(3);
