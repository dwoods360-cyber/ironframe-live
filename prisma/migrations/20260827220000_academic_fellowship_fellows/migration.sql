-- Academic Fellowship (Tier 2) Phase 1 models

CREATE TYPE "FellowAcademicTrack" AS ENUM (
  'MSCSIA_CAPSTONE',
  'MSCSIA_COURSEWORK',
  'BS_CYBERSECURITY',
  'ALUMNI_PRACTITIONER'
);

CREATE TYPE "FellowEmployerType" AS ENUM (
  'MSP_MSSP',
  'REGIONAL_BANKING',
  'HEALTHCARE',
  'DEFENSE_CONTRACTOR',
  'ENTERPRISE_IT',
  'NON_COMMERCIAL_STUDENT'
);

CREATE TYPE "FellowStatus" AS ENUM (
  'PENDING_VERIFY',
  'ACTIVE',
  'REVOKED'
);

CREATE TYPE "FellowLabFocus" AS ENUM (
  'EXPOSURE_MATH',
  'MULTI_TENANT_EVIDENCE',
  'TPRM_INGEST',
  'CAPSTONE_DATASET'
);

CREATE TYPE "FellowMissionCode" AS ENUM (
  'EXPOSURE',
  'INGEST',
  'BOUNDARY',
  'LINEAGE'
);

CREATE TYPE "FellowMissionStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'PASSED',
  'FAILED'
);

CREATE TABLE "fellows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "linked_in_url" TEXT NOT NULL,
  "academic_track" "FellowAcademicTrack" NOT NULL,
  "employer_type" "FellowEmployerType" NOT NULL DEFAULT 'NON_COMMERCIAL_STUDENT',
  "lab_focus" "FellowLabFocus" NOT NULL DEFAULT 'MULTI_TENANT_EVIDENCE',
  "status" "FellowStatus" NOT NULL DEFAULT 'PENDING_VERIFY',
  "tenant_enclave_id" TEXT NOT NULL DEFAULT 'ironframe-academic-sandbox',
  "completion_badge_hash" TEXT,
  "badge_issued_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fellows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellows_email_key" ON "fellows"("email");
CREATE UNIQUE INDEX "fellows_completion_badge_hash_key" ON "fellows"("completion_badge_hash");
CREATE INDEX "fellows_status_idx" ON "fellows"("status");
CREATE INDEX "fellows_tenant_enclave_id_idx" ON "fellows"("tenant_enclave_id");

CREATE TABLE "fellow_missions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fellow_id" UUID NOT NULL,
  "mission_number" INTEGER NOT NULL,
  "mission_code" "FellowMissionCode" NOT NULL,
  "status" "FellowMissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "telemetry_data" JSONB,
  "failure_reason" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fellow_missions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellow_missions_fellow_id_mission_number_key" ON "fellow_missions"("fellow_id", "mission_number");
CREATE INDEX "fellow_missions_fellow_id_status_idx" ON "fellow_missions"("fellow_id", "status");

ALTER TABLE "fellow_missions"
  ADD CONSTRAINT "fellow_missions_fellow_id_fkey"
  FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "fellow_mission_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fellow_id" UUID NOT NULL,
  "mission_code" "FellowMissionCode" NOT NULL,
  "receipt_token" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fellow_mission_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellow_mission_receipts_receipt_token_key" ON "fellow_mission_receipts"("receipt_token");
CREATE INDEX "fellow_mission_receipts_fellow_id_mission_code_idx" ON "fellow_mission_receipts"("fellow_id", "mission_code");

ALTER TABLE "fellow_mission_receipts"
  ADD CONSTRAINT "fellow_mission_receipts_fellow_id_fkey"
  FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "fellow_rubric_submissions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fellow_id" UUID NOT NULL,
  "quantitative_score" INTEGER NOT NULL,
  "lineage_score" INTEGER NOT NULL,
  "isolation_score" INTEGER NOT NULL,
  "velocity_score" INTEGER NOT NULL,
  "math_friction_notes" TEXT NOT NULL,
  "academic_use_description" TEXT NOT NULL,
  "workplace_friction_json" JSONB NOT NULL DEFAULT '[]',
  "request_briefing" BOOLEAN NOT NULL DEFAULT false,
  "ops_commercial_lead_flag" BOOLEAN NOT NULL DEFAULT false,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fellow_rubric_submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellow_rubric_submissions_fellow_id_key" ON "fellow_rubric_submissions"("fellow_id");
CREATE INDEX "fellow_rubric_submissions_ops_commercial_lead_flag_request_briefing_idx"
  ON "fellow_rubric_submissions"("ops_commercial_lead_flag", "request_briefing");

ALTER TABLE "fellow_rubric_submissions"
  ADD CONSTRAINT "fellow_rubric_submissions_fellow_id_fkey"
  FOREIGN KEY ("fellow_id") REFERENCES "fellows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
