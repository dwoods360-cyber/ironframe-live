-- Ironbloom Sprint 5.1: physical sustainability ledger (kWh, L, CO2e grams)

CREATE TABLE "SustainabilityMetric" (
    "id" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "kwhAverted" BIGINT NOT NULL,
    "coolingWaterLiters" DOUBLE PRECISION NOT NULL,
    "carbonOffsetGrams" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SustainabilityMetric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SustainabilityMetric_threatId_key" ON "SustainabilityMetric"("threatId");

ALTER TABLE "SustainabilityMetric" ADD CONSTRAINT "SustainabilityMetric_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
