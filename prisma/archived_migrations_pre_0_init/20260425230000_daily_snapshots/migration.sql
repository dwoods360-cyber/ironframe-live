CREATE TABLE "daily_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "total_loss_cents" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_snapshots_date_key" ON "daily_snapshots"("date");
