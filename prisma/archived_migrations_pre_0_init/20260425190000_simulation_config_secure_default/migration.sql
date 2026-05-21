-- Replace legacy lab config with secure-by-default simulation config (automated updates OFF).
DROP TABLE IF EXISTS "simulation_lab_config";

CREATE TABLE "simulation_config" (
    "id" TEXT NOT NULL,
    "automated_updates_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_config_pkey" PRIMARY KEY ("id")
);
