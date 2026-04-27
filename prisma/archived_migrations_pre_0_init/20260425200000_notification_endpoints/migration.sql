-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('SLACK', 'TEAMS', 'WEBHOOK');

-- CreateTable
CREATE TABLE "notification_endpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url_encrypted" TEXT NOT NULL,
    "channel_type" "NotificationChannelType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_endpoints_is_enabled_idx" ON "notification_endpoints"("is_enabled");
