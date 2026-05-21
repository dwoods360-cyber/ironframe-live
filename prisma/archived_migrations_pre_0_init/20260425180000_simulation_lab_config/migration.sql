-- Global lab / simulation UI flags (Control Room, Integrity Hub).
CREATE TABLE "simulation_lab_config" (
    "id" TEXT NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_lab_config_pkey" PRIMARY KEY ("id")
);
