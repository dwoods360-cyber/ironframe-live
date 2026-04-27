-- Shadow directory table for simulator-only employee personas (PhishBot/InfilBot/Attbot).
-- This table is intentionally isolated from any real auth user identities.
CREATE TABLE "SyntheticEmployee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clearanceLevel" INTEGER NOT NULL,
    "vulnerabilityScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticEmployee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyntheticEmployee_email_key" ON "SyntheticEmployee"("email");
CREATE INDEX "SyntheticEmployee_vulnerabilityScore_idx" ON "SyntheticEmployee"("vulnerabilityScore");
