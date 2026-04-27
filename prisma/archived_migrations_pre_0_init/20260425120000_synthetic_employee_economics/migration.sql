-- Economics + attack tracking for shadow-directory personas (USD cents, BigInt).
ALTER TABLE "SyntheticEmployee" ADD COLUMN "monetaryValue" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "SyntheticEmployee" ADD COLUMN "lastAttackedAt" TIMESTAMP(3);
ALTER TABLE "SyntheticEmployee" ADD COLUMN "totalLossIncurred" BIGINT NOT NULL DEFAULT 0;
