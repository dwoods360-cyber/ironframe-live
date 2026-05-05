-- CreateTable
CREATE TABLE "market_benchmark_snapshots" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "average_ale_cents" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_benchmark_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_benchmark_snapshots_industry_timestamp_idx" ON "market_benchmark_snapshots"("industry", "timestamp" DESC);
