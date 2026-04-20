-- GRC purge: child rows referencing ThreatEvent with ON DELETE RESTRICT must be removed before ThreatEvent deleteMany.
CREATE TABLE "ThreatAssignment" (
    "id" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "ThreatAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThreatAssignment_threatId_idx" ON "ThreatAssignment"("threatId");

CREATE INDEX "ThreatAssignment_tenantId_idx" ON "ThreatAssignment"("tenantId");

ALTER TABLE "ThreatAssignment" ADD CONSTRAINT "ThreatAssignment_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
