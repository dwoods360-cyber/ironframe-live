-- Hall of Shame + reset reason analytics
CREATE TYPE "StreakResetReason" AS ENUM (
  'WEBHOOK_FAILURE',
  'SCORE_DIP',
  'VIP_BREACH',
  'MANUAL_RESET'
);

ALTER TABLE "simulation_config"
  ADD COLUMN "last_reset_reason" "StreakResetReason";

CREATE TABLE "streak_failure_logs" (
  "id" TEXT NOT NULL,
  "reason" "StreakResetReason" NOT NULL,
  "reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lost_streak_days" INTEGER NOT NULL,
  CONSTRAINT "streak_failure_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "streak_failure_logs_reason_reset_at_idx"
  ON "streak_failure_logs"("reason", "reset_at");
