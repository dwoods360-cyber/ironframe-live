-- Academic Fellowship isolation plane (Phase 1 hardening)
-- Schema: academic_fellows (never co-locate with Path B Tenant/Evidence in public)

CREATE SCHEMA IF NOT EXISTS "academic_fellows";

CREATE TYPE "academic_fellows"."FellowAcademicTrack" AS ENUM (
  'MSCSIA_CAPSTONE',
  'MSCSIA_COURSEWORK',
  'BS_CYBERSECURITY',
  'ALUMNI_PRACTITIONER'
);

CREATE TYPE "academic_fellows"."FellowEmployerType" AS ENUM (
  'MSP_MSSP',
  'REGIONAL_BANKING',
  'HEALTHCARE',
  'DEFENSE_CONTRACTOR',
  'ENTERPRISE_IT',
  'NON_COMMERCIAL_STUDENT',
  'OTHER'
);

CREATE TYPE "academic_fellows"."FellowStatus" AS ENUM (
  'PENDING_VERIFY',
  'ACTIVE',
  'REVOKED'
);

CREATE TYPE "academic_fellows"."FellowLabFocus" AS ENUM (
  'EXPOSURE_MATH',
  'MULTI_TENANT_EVIDENCE',
  'TPRM_INGEST',
  'CAPSTONE_DATASET'
);

CREATE TYPE "academic_fellows"."FellowMissionCode" AS ENUM (
  'EXPOSURE',
  'INGEST',
  'BOUNDARY',
  'LINEAGE'
);

CREATE TYPE "academic_fellows"."FellowMissionStatus" AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'PASSED',
  'FAILED'
);

CREATE TABLE "academic_fellows"."fellows" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "full_name" TEXT NOT NULL,
  "linked_in_url" TEXT NOT NULL,
  "academic_track" "academic_fellows"."FellowAcademicTrack" NOT NULL,
  "employer_type" "academic_fellows"."FellowEmployerType" NOT NULL DEFAULT 'NON_COMMERCIAL_STUDENT',
  "employment_context" TEXT,
  "lab_focus" "academic_fellows"."FellowLabFocus" NOT NULL DEFAULT 'MULTI_TENANT_EVIDENCE',
  "status" "academic_fellows"."FellowStatus" NOT NULL DEFAULT 'PENDING_VERIFY',
  "tenant_enclave_id" TEXT NOT NULL DEFAULT 'ironframe-academic-sandbox',
  "completion_badge_hash" TEXT,
  "badge_issued_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fellows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellows_email_key" ON "academic_fellows"."fellows"("email");
CREATE UNIQUE INDEX "fellows_completion_badge_hash_key" ON "academic_fellows"."fellows"("completion_badge_hash");
CREATE INDEX "fellows_status_idx" ON "academic_fellows"."fellows"("status");
CREATE INDEX "fellows_tenant_enclave_id_idx" ON "academic_fellows"."fellows"("tenant_enclave_id");

CREATE TABLE "academic_fellows"."fellow_missions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fellow_id" UUID NOT NULL,
  "mission_number" INTEGER NOT NULL,
  "mission_code" "academic_fellows"."FellowMissionCode" NOT NULL,
  "status" "academic_fellows"."FellowMissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "telemetry_data" JSONB,
  "failure_reason" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fellow_missions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellow_missions_fellow_id_mission_number_key"
  ON "academic_fellows"."fellow_missions"("fellow_id", "mission_number");
CREATE INDEX "fellow_missions_fellow_id_status_idx"
  ON "academic_fellows"."fellow_missions"("fellow_id", "status");

ALTER TABLE "academic_fellows"."fellow_missions"
  ADD CONSTRAINT "fellow_missions_fellow_id_fkey"
  FOREIGN KEY ("fellow_id") REFERENCES "academic_fellows"."fellows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "academic_fellows"."fellow_mission_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fellow_id" UUID NOT NULL,
  "mission_code" "academic_fellows"."FellowMissionCode" NOT NULL,
  "receipt_token" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fellow_mission_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fellow_mission_receipts_receipt_token_key"
  ON "academic_fellows"."fellow_mission_receipts"("receipt_token");
CREATE INDEX "fellow_mission_receipts_fellow_id_mission_code_idx"
  ON "academic_fellows"."fellow_mission_receipts"("fellow_id", "mission_code");

ALTER TABLE "academic_fellows"."fellow_mission_receipts"
  ADD CONSTRAINT "fellow_mission_receipts_fellow_id_fkey"
  FOREIGN KEY ("fellow_id") REFERENCES "academic_fellows"."fellows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "academic_fellows"."fellow_rubric_submissions" (
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

CREATE UNIQUE INDEX "fellow_rubric_submissions_fellow_id_key"
  ON "academic_fellows"."fellow_rubric_submissions"("fellow_id");
CREATE INDEX "fellow_rubric_submissions_ops_commercial_lead_flag_request_briefing_idx"
  ON "academic_fellows"."fellow_rubric_submissions"("ops_commercial_lead_flag", "request_briefing");

ALTER TABLE "academic_fellows"."fellow_rubric_submissions"
  ADD CONSTRAINT "fellow_rubric_submissions_fellow_id_fkey"
  FOREIGN KEY ("fellow_id") REFERENCES "academic_fellows"."fellows"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Table-owner RLS: force policies even for table owner when using a locked-down role.
ALTER TABLE "academic_fellows"."fellows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_fellows"."fellow_missions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_fellows"."fellow_mission_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "academic_fellows"."fellow_rubric_submissions" ENABLE ROW LEVEL SECURITY;

-- Permissive policies for the academic app role (refined after role bootstrap).
-- Until 01_create_role_and_grants.sql is applied, the migrating role needs these policies.
CREATE POLICY fellows_app_all ON "academic_fellows"."fellows"
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY fellow_missions_app_all ON "academic_fellows"."fellow_missions"
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY fellow_mission_receipts_app_all ON "academic_fellows"."fellow_mission_receipts"
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY fellow_rubric_submissions_app_all ON "academic_fellows"."fellow_rubric_submissions"
  FOR ALL USING (true) WITH CHECK (true);
