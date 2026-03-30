-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "admin_alert_email" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemConfig" ("id", "admin_alert_email", "updatedAt")
VALUES ('global', NULL, CURRENT_TIMESTAMP);
