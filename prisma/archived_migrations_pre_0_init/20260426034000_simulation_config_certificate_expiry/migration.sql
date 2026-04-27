-- 30-day compliance certificate lifecycle
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'EXPIRED', 'IN_PROGRESS');

ALTER TABLE "simulation_config"
  ADD COLUMN "certificate_status" "CertificateStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  ADD COLUMN "certificate_issued_at" TIMESTAMP(3);
