-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StreakResetReason" AS ENUM ('WEBHOOK_FAILURE', 'SCORE_DIP', 'VIP_BREACH', 'MANUAL_RESET');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('VALID', 'EXPIRED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('SLACK', 'TEAMS', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SyntheticEmployeeStatus" AS ENUM ('PROTECTED', 'BREACHED');

-- CreateEnum
CREATE TYPE "EvidenceEntityType" AS ENUM ('THREAT_EVENT', 'BOT_AUDIT_LOG', 'AUDIT_LOG', 'INTEGRITY_EVENT');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('CRITICAL', 'HIGH', 'MED', 'LOW');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ONLINE', 'OFFLINE', 'THINKING', 'ERROR');

-- CreateEnum
CREATE TYPE "ThreatState" AS ENUM ('PIPELINE', 'QUARANTINED', 'ACTIVE', 'CONFIRMED', 'ESCALATED', 'PENDING_REMOTE_INTERVENTION', 'RESOLVED', 'DE_ACKNOWLEDGED', 'MANUAL_HOLD');

-- CreateEnum
CREATE TYPE "DeAckReason" AS ENUM ('FALSE_POSITIVE', 'COMPENSATING_CONTROL', 'ACCEPTABLE_RISK', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "AgentOperationStatus" AS ENUM ('PENDING', 'RETRYING', 'CHAOS_INTERRUPTED', 'FAILED', 'COMPLETED', 'ESCALATED', 'EXTERNALLY_RESOLVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('JR_GRC_ANALYST', 'SR_GRC_ANALYST', 'GRC_MANAGER', 'DIRECTOR_OF_COMPLIANCE', 'CISO', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR', 'GLOBAL_ADMIN');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('LANGGRAPH', 'SYSTEM', 'ADMIN');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT 'Secure Enclave',
    "ale_baseline" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "industry_avg_loss_cents" BIGINT,
    "infrastructure_val_cents" BIGINT,
    "is_test_record" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_scan" TEXT NOT NULL DEFAULT 'Today',

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "active_risks" (
    "id" BIGSERIAL NOT NULL,
    "company_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee_id" TEXT,
    "score_cents" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "issimulation" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "active_risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskTier" TEXT NOT NULL DEFAULT 'LOW',
    "tenantId" UUID NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceAgent" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "financialRisk_cents" BIGINT NOT NULL DEFAULT 0,
    "tenantCompanyId" BIGINT,
    "status" "ThreatState" NOT NULL DEFAULT 'PIPELINE',
    "remote_tech_id" TEXT,
    "remoteAccessAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "ttlSeconds" INTEGER NOT NULL DEFAULT 259200,
    "deAckReason" "DeAckReason",
    "assignee_id" TEXT,
    "aiReport" TEXT,
    "ingestionDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disposition_status" TEXT,
    "is_false_positive" BOOLEAN NOT NULL DEFAULT false,
    "receipt_hash" TEXT,
    "ingestion_fingerprint" TEXT,
    "resolution_approval_id" TEXT,

    CONSTRAINT "ThreatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimThreatEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceAgent" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "financialRisk_cents" BIGINT NOT NULL DEFAULT 0,
    "tenantCompanyId" BIGINT,
    "status" "ThreatState" NOT NULL DEFAULT 'PIPELINE',
    "remote_tech_id" TEXT,
    "remoteAccessAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "ttlSeconds" INTEGER NOT NULL DEFAULT 259200,
    "deAckReason" "DeAckReason",
    "assignee_id" TEXT,
    "aiReport" TEXT,
    "ingestionDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disposition_status" TEXT,
    "is_false_positive" BOOLEAN NOT NULL DEFAULT false,
    "receipt_hash" TEXT,
    "assignment_history" JSONB,
    "category" TEXT,
    "impact_radius" DOUBLE PRECISION,
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "remediation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "ingestion_fingerprint" TEXT,

    CONSTRAINT "SimThreatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationDiagnosticLog" (
    "id" TEXT NOT NULL,
    "tenantUuid" UUID NOT NULL,
    "simThreatId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SimulationDiagnosticLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_config" (
    "id" TEXT NOT NULL,
    "automated_updates_enabled" BOOLEAN NOT NULL DEFAULT false,
    "target_readiness_score" INTEGER NOT NULL DEFAULT 90,
    "is_certified" BOOLEAN NOT NULL DEFAULT false,
    "certified_at" TIMESTAMP(3),
    "certificate_status" "CertificateStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "certificate_issued_at" TIMESTAMP(3),
    "historical_lowest_score" INTEGER NOT NULL DEFAULT 100,
    "historical_lowest_recorded_at" TIMESTAMP(3),
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_reset_reason" "StreakResetReason",
    "grace_window_started_at" TIMESTAMP(3),
    "grace_window_expires_at" TIMESTAMP(3),
    "successful_grace_recoveries" INTEGER NOT NULL DEFAULT 0,
    "is_elite_operator" BOOLEAN NOT NULL DEFAULT false,
    "completed_deep_dives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_simulation_started_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulation_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "total_loss_cents" BIGINT NOT NULL DEFAULT 0,
    "premium_cents" BIGINT NOT NULL DEFAULT 0,
    "executive_summary" TEXT,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_failure_logs" (
    "id" TEXT NOT NULL,
    "reason" "StreakResetReason" NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lost_streak_days" INTEGER NOT NULL,
    "is_excluded_from_analytics" BOOLEAN NOT NULL DEFAULT false,
    "exclusion_reason" VARCHAR(256),

    CONSTRAINT "streak_failure_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_endpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url_encrypted" TEXT NOT NULL,
    "channel_type" "NotificationChannelType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_probe_at" TIMESTAMP(3),
    "last_probe_ok" BOOLEAN,
    "last_probe_detail" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyntheticEmployee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "clearanceLevel" INTEGER NOT NULL,
    "vulnerabilityScore" DOUBLE PRECISION NOT NULL,
    "monetaryValue" BIGINT NOT NULL DEFAULT 0,
    "lastAttackedAt" TIMESTAMP(3),
    "totalLossIncurred" BIGINT NOT NULL DEFAULT 0,
    "is_hardened" BOOLEAN NOT NULL DEFAULT false,
    "is_breached" BOOLEAN NOT NULL DEFAULT false,
    "status" "SyntheticEmployeeStatus" NOT NULL DEFAULT 'PROTECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatAssignment" (
    "id" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,

    CONSTRAINT "ThreatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentOperation" (
    "id" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" "AgentOperationStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChaosConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChaosConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "admin_alert_email" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SustainabilityMetric" (
    "id" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "kwhAverted" BIGINT NOT NULL,
    "coolingWaterLiters" DOUBLE PRECISION NOT NULL,
    "carbonOffsetGrams" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SustainabilityMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkNote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "threatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threat_approvals" (
    "id" TEXT NOT NULL,
    "threat_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_user_id" TEXT NOT NULL,
    "approved_by_user_id" TEXT,
    "approval_note" TEXT,
    "approval_payload_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "threat_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_artifacts" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "threat_approval_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_attachments" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "entity_type" "EvidenceEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "attached_by_user_id" TEXT NOT NULL,
    "attachment_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrity_events" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "prev_event_hash" TEXT,
    "event_hash" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrity_exports" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integrity_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "justification" TEXT,
    "operatorId" TEXT NOT NULL,
    "isSimulation" BOOLEAN NOT NULL DEFAULT false,
    "threatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "simThreatId" TEXT,
    "governance_tenant_uuid" UUID,
    "updated_by" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotAuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "botType" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "operator" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "BotAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Failed_Jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error_state" JSONB NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Failed_Jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ironscout_Tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "target_url" TEXT NOT NULL,
    "directive" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ironscout_Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grc_template_config" (
    "id" TEXT NOT NULL,
    "generalRfiChecklist" JSONB NOT NULL,
    "vendorTypeRequirements" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grc_template_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ironwatch_log" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ironwatch_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarantine_records" (
    "id" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quarantine_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_comments" (
    "id" TEXT NOT NULL,
    "audit_log_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "comment_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_exports" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "generated_by" TEXT NOT NULL,
    "manifest_hash" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_risks" INTEGER NOT NULL,
    "total_ale" BIGINT NOT NULL,
    "compliance_score" INTEGER NOT NULL,
    "framework_metrics" JSONB NOT NULL,

    CONSTRAINT "compliance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_policy_history" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "previous_mode" TEXT NOT NULL,
    "new_mode" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_policy_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_settings" (
    "id" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "logging_mode" TEXT NOT NULL DEFAULT 'GRC_ATOMIC',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "governance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "companies_tenantId_idx" ON "companies"("tenantId");

-- CreateIndex
CREATE INDEX "active_risks_company_id_idx" ON "active_risks"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "ThreatEvent_ingestion_fingerprint_key" ON "ThreatEvent"("ingestion_fingerprint");

-- CreateIndex
CREATE INDEX "ThreatEvent_tenantCompanyId_idx" ON "ThreatEvent"("tenantCompanyId");

-- CreateIndex
CREATE INDEX "ThreatEvent_resolution_approval_id_idx" ON "ThreatEvent"("resolution_approval_id");

-- CreateIndex
CREATE UNIQUE INDEX "SimThreatEvent_ingestion_fingerprint_key" ON "SimThreatEvent"("ingestion_fingerprint");

-- CreateIndex
CREATE INDEX "SimThreatEvent_tenantCompanyId_idx" ON "SimThreatEvent"("tenantCompanyId");

-- CreateIndex
CREATE INDEX "SimulationDiagnosticLog_tenantUuid_createdAt_idx" ON "SimulationDiagnosticLog"("tenantUuid", "createdAt");

-- CreateIndex
CREATE INDEX "SimulationDiagnosticLog_simThreatId_idx" ON "SimulationDiagnosticLog"("simThreatId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_snapshots_date_key" ON "daily_snapshots"("date");

-- CreateIndex
CREATE INDEX "streak_failure_logs_reason_reset_at_idx" ON "streak_failure_logs"("reason", "reset_at");

-- CreateIndex
CREATE INDEX "notification_endpoints_is_enabled_idx" ON "notification_endpoints"("is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SyntheticEmployee_email_key" ON "SyntheticEmployee"("email");

-- CreateIndex
CREATE INDEX "SyntheticEmployee_vulnerabilityScore_idx" ON "SyntheticEmployee"("vulnerabilityScore");

-- CreateIndex
CREATE INDEX "ThreatAssignment_threatId_idx" ON "ThreatAssignment"("threatId");

-- CreateIndex
CREATE INDEX "ThreatAssignment_tenantId_idx" ON "ThreatAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "AgentOperation_threatId_idx" ON "AgentOperation"("threatId");

-- CreateIndex
CREATE INDEX "AgentOperation_status_idx" ON "AgentOperation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgentOperation_threatId_agentName_key" ON "AgentOperation"("threatId", "agentName");

-- CreateIndex
CREATE UNIQUE INDEX "SustainabilityMetric_threatId_key" ON "SustainabilityMetric"("threatId");

-- CreateIndex
CREATE INDEX "user_role_assignments_tenant_id_role_idx" ON "user_role_assignments"("tenant_id", "role");

-- CreateIndex
CREATE INDEX "user_role_assignments_user_id_tenant_id_idx" ON "user_role_assignments"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "threat_approvals_threat_id_tenant_id_idx" ON "threat_approvals"("threat_id", "tenant_id");

-- CreateIndex
CREATE INDEX "threat_approvals_tenant_id_status_idx" ON "threat_approvals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "threat_approvals_requested_by_user_id_idx" ON "threat_approvals"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "evidence_artifacts_tenant_id_idx" ON "evidence_artifacts"("tenant_id");

-- CreateIndex
CREATE INDEX "evidence_artifacts_tenant_id_created_at_idx" ON "evidence_artifacts"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "evidence_artifacts_threat_approval_id_idx" ON "evidence_artifacts"("threat_approval_id");

-- CreateIndex
CREATE INDEX "evidence_artifacts_sha256_idx" ON "evidence_artifacts"("sha256");

-- CreateIndex
CREATE INDEX "evidence_attachments_entity_id_entity_type_idx" ON "evidence_attachments"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "evidence_attachments_tenant_id_created_at_idx" ON "evidence_attachments"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "evidence_attachments_artifact_id_idx" ON "evidence_attachments"("artifact_id");

-- CreateIndex
CREATE INDEX "integrity_events_tenant_id_idx" ON "integrity_events"("tenant_id");

-- CreateIndex
CREATE INDEX "integrity_exports_tenant_id_idx" ON "integrity_exports"("tenant_id");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_governance_tenant_uuid_createdAt_idx" ON "AuditLog"("governance_tenant_uuid", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_isSimulation_simThreatId_idx" ON "AuditLog"("isSimulation", "simThreatId");

-- CreateIndex
CREATE INDEX "AuditLog_simThreatId_idx" ON "AuditLog"("simThreatId");

-- CreateIndex
CREATE INDEX "BotAuditLog_createdAt_idx" ON "BotAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "BotAuditLog_tenantId_idx" ON "BotAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "BotAuditLog_botType_idx" ON "BotAuditLog"("botType");

-- CreateIndex
CREATE INDEX "Failed_Jobs_tenant_id_idx" ON "Failed_Jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "Failed_Jobs_status_idx" ON "Failed_Jobs"("status");

-- CreateIndex
CREATE INDEX "Ironscout_Tasks_tenant_id_idx" ON "Ironscout_Tasks"("tenant_id");

-- CreateIndex
CREATE INDEX "Ironscout_Tasks_expires_at_idx" ON "Ironscout_Tasks"("expires_at");

-- CreateIndex
CREATE INDEX "ironwatch_log_actor_id_idx" ON "ironwatch_log"("actor_id");

-- CreateIndex
CREATE INDEX "ironwatch_log_created_at_idx" ON "ironwatch_log"("created_at");

-- CreateIndex
CREATE INDEX "ironwatch_log_event_type_idx" ON "ironwatch_log"("event_type");

-- CreateIndex
CREATE INDEX "quarantine_records_tenantId_idx" ON "quarantine_records"("tenantId");

-- CreateIndex
CREATE INDEX "audit_comments_audit_log_id_idx" ON "audit_comments"("audit_log_id");

-- CreateIndex
CREATE INDEX "audit_exports_tenant_id_idx" ON "audit_exports"("tenant_id");

-- CreateIndex
CREATE INDEX "compliance_snapshots_tenant_id_idx" ON "compliance_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "governance_policy_history_tenant_id_idx" ON "governance_policy_history"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "governance_settings_tenantId_key" ON "governance_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "active_risks" ADD CONSTRAINT "active_risks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatEvent" ADD CONSTRAINT "ThreatEvent_resolution_approval_id_fkey" FOREIGN KEY ("resolution_approval_id") REFERENCES "threat_approvals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatAssignment" ADD CONSTRAINT "ThreatAssignment_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentOperation" ADD CONSTRAINT "AgentOperation_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityMetric" ADD CONSTRAINT "SustainabilityMetric_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkNote" ADD CONSTRAINT "WorkNote_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threat_approvals" ADD CONSTRAINT "threat_approvals_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "ThreatEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_threat_approval_id_fkey" FOREIGN KEY ("threat_approval_id") REFERENCES "threat_approvals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_attachments" ADD CONSTRAINT "evidence_attachments_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "evidence_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_simThreatId_fkey" FOREIGN KEY ("simThreatId") REFERENCES "SimThreatEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_threatId_fkey" FOREIGN KEY ("threatId") REFERENCES "ThreatEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_comments" ADD CONSTRAINT "audit_comments_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "AuditLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_snapshots" ADD CONSTRAINT "compliance_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_policy_history" ADD CONSTRAINT "governance_policy_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_settings" ADD CONSTRAINT "governance_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

