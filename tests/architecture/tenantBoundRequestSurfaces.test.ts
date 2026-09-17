import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Locks the highest-traffic remaining tenant request paths onto Ironguard
 * transaction binding. This is not full coverage.
 */

const REPO_ROOT = join(__dirname, "..", "..");

const BOUND_SURFACES: Array<{ path: string; markers: string[] }> = [
  {
    path: "app/utils/activeThreatsBoardQuery.ts",
    markers: ["withIronguardTenant", "listControlStressRiskEventsForTenant"],
  },
  {
    path: "app/actions/dashboardActions.ts",
    markers: ["withIronguardTenant", "getDashboardPayloadForTenant"],
  },
  {
    path: "app/actions/auditActions.ts",
    markers: ["withIronguardTenant", "fetchTenantAuditLedgerRows"],
  },
  {
    path: "app/api/board/feed/route.ts",
    markers: ["withIronguardTenant", "tenantId query parameter"],
  },
  {
    path: "app/api/audit/intelligence-feed/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/audit/export/route.ts",
    markers: ["assertAuthenticatedIronguardTenantOr403", "requireTenantAccess"],
  },
  {
    path: "app/utils/insuranceTenantModel.ts",
    markers: ["withIronguardTenant", "loadInsuranceModelForTenant"],
  },
  {
    path: "app/api/threats/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/threats/ingest/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/threats/[id]/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/threats/validate/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/threat-events-heatmap/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/actions/sentinelLaborActions.ts",
    markers: ["withIronguardTenant", "incrementSentinelDeepMonitoringLabor"],
  },
  {
    path: "app/actions/threatActions.ts",
    markers: [
      "withIronguardTenant",
      "IRONGUARD_SESSION_TENANT_UUID_REQUIRED",
      "threatTenantTx",
      "withResolvedThreatTenant",
    ],
  },
  {
    path: "app/api/opsupport/clearance-queue/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/opsupport/simulation-audit/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/opsupport/diagnostic-history/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/opsupport/deficiency-queue/route.ts",
    markers: ["withIronguardTenant", "loadOperationalDeficiencyQueueState"],
  },
  {
    path: "app/api/incident-report/[threatId]/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/dmz/pipeline-telemetry/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/api/insurance/actuarial-report/route.ts",
    markers: ["withIronguardTenant", "fetchInsuranceModelForTenant"],
  },
  {
    path: "app/actions/clearanceActions.ts",
    markers: ["withIronguardTenant", "updateClearanceThreatRow"],
  },
  {
    path: "app/actions/incidentReportActions.ts",
    markers: ["withIronguardTenant", "getCompanyIdForActiveTenant"],
  },
  {
    path: "app/actions/operationalDeficiencyActions.ts",
    markers: ["withIronguardTenant", "simulationDiagnosticLog"],
  },
  {
    path: "src/services/orchestration/checkpointer.ts",
    markers: [
      "TenantBoundPostgresSaver",
      "assertCheckpointTenantParity",
      "composeCheckpointThreadId",
      "IRONGUARD_SESSION_TENANT_UUID_REQUIRED",
    ],
  },
  {
    path: "app/lib/server/cronTenantScope.ts",
    markers: ["listCatalogTenantIds", "recordCronJobArtifact", "withIronguardTenant"],
  },
  {
    path: "app/api/cron/narrate/route.ts",
    markers: ["resolveCronTenantIds", "runNightlyGovernanceNarrate"],
  },
  {
    path: "app/services/ironbloom/carbonBudgetReallocationAlert.ts",
    markers: ["withIronguardTenant", "recordCronJobArtifact"],
  },
  {
    path: "app/lib/complianceDriftState.ts",
    markers: ["withIronguardTenant", "recordCronJobArtifact"],
  },
  {
    path: "app/services/ironsight/crawler.ts",
    markers: ["withIronguardTenant", "runIndustryScoutWorker"],
  },
  {
    path: "app/lib/board/sharedBoardContext.ts",
    markers: ["withIronguardTenant", "getSharedBoardContextForTenant"],
  },
  {
    path: "app/threats/[id]/page.tsx",
    markers: ["withIronguardTenant", "getActiveTenantUuidFromCookies"],
  },
  {
    path: "src/services/compliance/irontallyEngine.ts",
    markers: ["withIronguardTenant", "compileFrameworkReadiness"],
  },
  {
    path: "app/lib/riskRegistryDb.ts",
    markers: ["withIronguardTenant", "listRiskRegistryForTenant"],
  },
  {
    path: "app/lib/governanceFrame/briefingLoader.ts",
    markers: ["withIronguardTenant", "fetchPublishedBriefingsForRequest"],
  },
  {
    path: "app/utils/incidentReportData.ts",
    markers: ["withIronguardTenant", "loadIncidentReportPayload"],
  },
  {
    path: "app/utils/postMortemReportService.ts",
    markers: ["withIronguardTenant", "generateAndAttachPostMortemReport"],
  },
  {
    path: "app/lib/ironbloom/carbonPulseState.ts",
    markers: [
      "withIronguardTenant",
      "readCarbonPulseStateForTenant",
      "readCarbonPulseStateForTenantBundle",
    ],
  },
  {
    path: "src/services/agents/ironlock/dirtyGridMonitor.ts",
    markers: ["withIronguardTenant", "readCarbonPulseStateForTenantBundle"],
  },
  {
    path: "src/services/agents/ironlock/throttlingEngine.ts",
    markers: ["withIronguardTenant", "readCarbonPulseStateForTenantBundle"],
  },
  {
    path: "app/api/internal/cron/industry-scout/route.ts",
    markers: ["resolveCronTenantIds", "readExplicitCronTenantId"],
  },
  {
    path: "app/api/internal/cron/carbon-budget-reallocation/route.ts",
    markers: ["resolveCronTenantIds", "readExplicitCronTenantId"],
  },
  {
    path: "app/api/internal/cron/ironsight-regulatory-poll/route.ts",
    markers: ["resolveCronTenantIds", "readExplicitCronTenantId"],
  },
  {
    path: "app/api/internal/cron/ironscribe-daily-audit/route.ts",
    markers: ["resolveCronTenantIds", "readExplicitCronTenantId"],
  },
  {
    path: "src/services/ironscribe/auditSynthesizer.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/api/internal/cron/gridcore-rate-poll/route.ts",
    markers: ["resolveCronTenantIds", "readExplicitCronTenantId", "withIronguardTenant"],
  },
  {
    path: "app/api/internal/cron/health-posture-triage/route.ts",
    markers: ["resolveCronTenantIds", "readExplicitCronTenantId"],
  },
  {
    path: "app/services/governanceScoring.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/(dashboard)/boardroom/admin/audit-logs/actions.ts",
    markers: ["withIronguardTenant"],
  },
  {
    path: "app/audit-logs/page.tsx",
    markers: ["withIronguardTenant", "getActiveTenantUuidFromCookies"],
  },
  {
    path: "app/lib/server/resolveWorkspaceAccessDenial.ts",
    markers: ["withIronguardTenant"],
  },
  {
    path: "app/lib/server/ironintelResiliencePollCore.ts",
    markers: ["withIronguardTenant", "getActiveTenantUuidFromCookies"],
  },
  {
    path: "app/utils/notificationAuditSummary.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "lib/reporting/boardReportQueries.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "lib/reporting/certification.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/services/ironscribe/staleDataOutagePostMortem.ts",
    markers: ["withIronguardTenant"],
  },
  {
    path: "app/services/irontechPostMortem.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/lib/postMortemEngine.ts",
    markers: ["withIronguardTenant"],
  },
  {
    path: "app/lib/lastWillAndTestament.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/api/admin/purge/route.ts",
    markers: ["requirePlatformAdministrator", "withIronguardTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/lib/security/quarantineTenantTargeting.ts",
    markers: ["withIronguardTenant", "listCatalogTenantIds", "getPrismaPrivileged"],
  },
  {
    path: "app/api/risk-events/[id]/budget-justification/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/lib/server/ironleadsTenantScope.ts",
    markers: ["withProspectPoolTenant", "withIronguardTenant", "resolveProspectPoolTenantId"],
  },
  {
    path: "app/lib/server/ironleadsAutoEnrichCore.ts",
    markers: ["withProspectPoolTenant"],
  },
  {
    path: "app/lib/server/ironleadsPendingPoolCore.ts",
    markers: ["withProspectPoolTenant"],
  },
  {
    path: "app/lib/server/ironleadsOsintNoisePurgeCore.ts",
    markers: ["withProspectPoolTenant"],
  },
  {
    path: "app/lib/server/ironleadsIngressCore.ts",
    markers: ["withIronguardTenant"],
  },
  {
    path: "app/lib/server/salesAgentConsoleCore.ts",
    markers: ["withIronguardTenant", "resolveProspectPoolTenantId"],
  },
  {
    path: "app/lib/server/operationsHubCore.ts",
    markers: ["withProspectPoolTenant", "listCatalogTenantIds"],
  },
  {
    path: "app/lib/server/operationsTeamPortalsCore.ts",
    markers: ["withProspectPoolTenant"],
  },
  {
    path: "app/lib/server/dedupeIronleadsSuspectsCore.ts",
    markers: ["listCatalogTenantIds", "withIronguardTenant"],
  },
  {
    path: "app/lib/security/ingressGateway.ts",
    markers: ["withIronguardTenant", "lookupIngressThreatTenantId"],
  },
  {
    path: "app/lib/agents/dmzThreatIngress.ts",
    markers: ["withIronguardTenant", "writeDmzThreatActivityWithIronlock"],
  },
  {
    path: "app/api/simulation/drillRouter.ts",
    markers: ["withIronguardTenant", "executeChaosDrill"],
  },
  {
    path: "app/api/ingestion/endpoint-compliance/route.ts",
    markers: ["withIronguardTenant", "assertAuthenticatedIronguardTenantOr403"],
  },
  {
    path: "app/actions/sentinelActions.ts",
    markers: ["withIronguardTenant", "listAuditorRiskLedger"],
  },
  {
    path: "app/actions/agentActions.ts",
    markers: ["withIronguardTenant", "triggerMarketVolatilityAutoHardening"],
  },
];

describe("tenant-bound request surfaces", () => {
  for (const surface of BOUND_SURFACES) {
    it(`keeps Ironguard binding on ${surface.path}`, () => {
      const source = readFileSync(join(REPO_ROOT, surface.path), "utf8");
      for (const marker of surface.markers) {
        expect(source).toContain(marker);
      }
    });
  }

  it("rejects unbound board feed syndication", () => {
    const source = readFileSync(join(REPO_ROOT, "app/api/board/feed/route.ts"), "utf8");
    expect(source).not.toMatch(/where:\s*tenantId\s*\?\s*\{\s*tenantId\s*\}\s*:\s*undefined/);
  });

  it("rejects unbound threat detail lookups", () => {
    const source = readFileSync(join(REPO_ROOT, "app/api/threats/[id]/route.ts"), "utf8");
    expect(source).not.toContain("prisma.threatEvent.findUnique");
    expect(source).not.toContain("where: { id }");
  });

  it("rejects unbound threat detail pages", () => {
    const source = readFileSync(join(REPO_ROOT, "app/threats/[id]/page.tsx"), "utf8");
    expect(source).not.toContain("prisma.threatEvent.findUnique");
    expect(source).not.toContain('from "@/lib/prisma"');
    expect(source).not.toContain("from '@/lib/prisma'");
  });

  it("keeps remaining threatActions mutations on bound helpers", () => {
    const source = readFileSync(join(REPO_ROOT, "app/actions/threatActions.ts"), "utf8");
    expect(source).not.toContain("prisma.$transaction(");
    expect(source).not.toContain("prisma.threatEvent.");
    expect(source).not.toContain("prisma.riskEvent.");
    expect(source).not.toContain("prisma.workNote.");
    expect(source).not.toContain("prisma.threatApproval.");
    expect(source).not.toContain("prisma.agentOperation.");
    expect(source).not.toContain("prisma.reasoningLog.");
  });

  it("fails closed when a checkpoint tenant stamp is missing", () => {
    const source = readFileSync(join(REPO_ROOT, "src/services/orchestration/checkpointer.ts"), "utf8");
    expect(source).toContain("assertCheckpointTenantParity");
    expect(source).not.toMatch(/if \(stampedTenant && stampedTenant !== trimmedTenant\)/);
  });

  it("keeps assertTenantAccess fail-closed for missing active tenant", () => {
    const source = readFileSync(join(REPO_ROOT, "app/utils/tenantIsolation.ts"), "utf8");
    expect(source).toContain("if (!active || !target) return false");
    expect(source).toContain("export function requireTenantAccess");
  });

  it("keeps remaining clearance mutations off the global Prisma client", () => {
    const source = readFileSync(join(REPO_ROOT, "app/actions/clearanceActions.ts"), "utf8");
    expect(source).not.toContain('from "@/lib/prisma"');
    expect(source).not.toContain("prisma.riskEvent.");
    expect(source).not.toContain("prisma.threatEvent.");
    expect(source).not.toContain("prisma.workNote.");
    expect(source).not.toContain("prisma.clearanceRequest.");
  });

  it("keeps incident report and deficiency actions off the global Prisma client", () => {
    const incident = readFileSync(join(REPO_ROOT, "app/actions/incidentReportActions.ts"), "utf8");
    const deficiency = readFileSync(
      join(REPO_ROOT, "app/actions/operationalDeficiencyActions.ts"),
      "utf8",
    );
    expect(incident).not.toContain('from "@/lib/prisma"');
    expect(deficiency).not.toContain('from "@/lib/prisma"');
  });

  it("leaves platform-global diagnostic abort logs unbound", () => {
    const source = readFileSync(
      join(REPO_ROOT, "app/api/opsupport/diagnostic-abort/route.ts"),
      "utf8",
    );
    expect(source).toContain("systemHealthLog");
    expect(source).toContain("requirePlatformAdministrator");
    expect(source).not.toContain("withIronguardTenant");
  });

  it("keeps cron job artifact writes off the global Prisma client", () => {
    const cronRoutes = [
      "app/api/internal/cron/carbon-budget-reallocation/route.ts",
      "app/api/internal/cron/ironscribe-daily-audit/route.ts",
      "app/api/internal/cron/ironsight-regulatory-poll/route.ts",
      "app/api/internal/cron/industry-scout/route.ts",
      "app/api/internal/cron/gridcore-rate-poll/route.ts",
      "app/api/internal/cron/ironleads-auto-enrich/route.ts",
      "app/lib/server/autonomousGtmBriefingQueueCore.ts",
      "app/lib/reports/narrateGovernanceTriad.ts",
      "app/services/ironbloom/carbonBudgetReallocationAlert.ts",
      "app/lib/complianceDriftState.ts",
    ];
    for (const relative of cronRoutes) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).toContain("recordCronJobArtifact");
      expect(source).not.toContain("cronJobArtifact.create");
    }
  });

  it("rejects silent Medshield cron fallbacks", () => {
    const cronRoutes = [
      "app/api/internal/cron/carbon-budget-reallocation/route.ts",
      "app/api/internal/cron/ironscribe-daily-audit/route.ts",
      "app/api/internal/cron/ironsight-regulatory-poll/route.ts",
      "app/api/internal/cron/industry-scout/route.ts",
      "app/api/internal/cron/health-posture-triage/route.ts",
    ];
    for (const relative of cronRoutes) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).toContain("resolveCronTenantIds");
      expect(source).not.toContain("TENANT_UUIDS.medshield");
    }
  });

  it("rejects silent Gridcore cron fallbacks", () => {
    const source = readFileSync(
      join(REPO_ROOT, "app/api/internal/cron/gridcore-rate-poll/route.ts"),
      "utf8",
    );
    expect(source).toContain("resolveCronTenantIds");
    expect(source).toContain("readExplicitCronTenantId");
    expect(source).not.toContain("TENANT_UUIDS.gridcore");
  });

  it("rejects unbound Ironscribe daily auditLog scans", () => {
    const source = readFileSync(join(REPO_ROOT, "src/services/ironscribe/auditSynthesizer.ts"), "utf8");
    expect(source).toContain("withIronguardTenant");
    expect(source).toContain("listCatalogTenantIds");
    expect(source).toContain("getPrismaPrivileged");
    expect(source).not.toMatch(/prisma\.auditLog\./);
    expect(source).not.toMatch(/prisma\.ironguardViolation/);
    expect(source).not.toMatch(/prisma\.systemConfig/);
    expect(source).toContain("prisma.quarantineLedger");
  });

  it("rejects unbound Carbon Pulse catalog reads", () => {
    const source = readFileSync(join(REPO_ROOT, "app/lib/ironbloom/carbonPulseState.ts"), "utf8");
    expect(source).not.toMatch(/prisma\.carbonPulseSample\.findMany\(/);
    expect(source).not.toMatch(/prisma\.dirtyGridAlert\.findMany\(/);
    expect(source).not.toMatch(/prisma\.ironlockCarbonThrottle\.findMany\(/);
  });

  it("keeps Ironleads and ops CRM off the global Prisma client", () => {
    const cores = [
      "app/lib/server/ironleadsAutoEnrichCore.ts",
      "app/lib/server/ironleadsPendingPoolCore.ts",
      "app/lib/server/ironleadsOsintNoisePurgeCore.ts",
      "app/lib/server/ironleadsApolloEnrichCore.ts",
      "app/lib/server/ironleadsProspeoEnrichCore.ts",
      "app/lib/server/ironleadsHunterEnrichCore.ts",
      "app/lib/server/ironleadsSuspectOperatorUpdateCore.ts",
      "app/lib/server/ironleadsSuspectReportCore.ts",
      "app/lib/server/ironleadsBuyingCommitteeResearchCore.ts",
      "app/lib/server/ironleadsMsspDirectoryImportCore.ts",
      "app/lib/server/dedupeIronleadsSuspectsCore.ts",
      "app/lib/server/salesAgentConsoleCore.ts",
      "app/lib/server/salesTouchHistoryCore.ts",
      "app/lib/server/salesTouch2QueueCore.ts",
      "app/lib/server/operationsHubCore.ts",
      "app/lib/server/operationsTeamPortalsCore.ts",
    ];
    for (const relative of cores) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).not.toContain("prisma.ironboardCrmContact.");
      expect(source).not.toContain("prisma.ironboardCrmDeal.");
      expect(source).not.toContain("prisma.ironboardCrmInteraction.");
    }
  });

  it("leaves platform-global ops_activities unbound", () => {
    const source = readFileSync(join(REPO_ROOT, "app/lib/server/opsScheduleCore.ts"), "utf8");
    expect(source).toContain("prisma.opsActivity");
    expect(source).not.toContain("withIronguardTenant");
  });

  it("keeps governance maturity AuditLog off the global Prisma client", () => {
    const source = readFileSync(join(REPO_ROOT, "app/services/governanceScoring.ts"), "utf8");
    expect(source).toContain("withIronguardTenant");
    expect(source).toContain("listCatalogTenantIds");
    expect(source).not.toMatch(/prisma\.auditLog\./);
    expect(source).not.toContain("auditLogCreateLoose(");
  });

  it("binds auditLogCreateLoose writers through Ironguard tenant transactions", () => {
    const source = readFileSync(join(REPO_ROOT, "lib/auditLogLoose.ts"), "utf8");
    expect(source).toContain("withIronguardTenant");
    expect(source).toContain("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
    expect(source).not.toMatch(/return prisma\.auditLog\.create/);
  });

  it("keeps Irongate ingress ThreatEvent/RiskEvent writers off the global Prisma client", () => {
    const source = readFileSync(join(REPO_ROOT, "app/lib/security/ingressGateway.ts"), "utf8");
    expect(source).toContain("withIronguardTenant");
    expect(source).not.toMatch(/prisma\.riskEvent\.(create|updateMany|findFirst)\(/);
    expect(source).not.toMatch(/prisma\.threatEvent\.(create|findUnique|findFirst)\(/);
  });

  it("keeps DMZ and endpoint-compliance ThreatEvent creates on bound transactions", () => {
    for (const relative of [
      "app/lib/agents/dmzThreatIngress.ts",
      "app/api/simulation/drillRouter.ts",
      "app/api/ingestion/endpoint-compliance/route.ts",
    ]) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).toContain("withIronguardTenant");
      expect(source).not.toMatch(/prisma\.threatEvent\.(create|findUnique|findFirst)/);
    }
  });

  it("keeps Sentinel and market-volatility RiskEvent writers off the global Prisma client", () => {
    for (const relative of ["app/actions/sentinelActions.ts", "app/actions/agentActions.ts"]) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).toContain("withIronguardTenant");
      expect(source).not.toMatch(/prisma\.riskEvent\.(create|upsert|findFirst|findMany|findUnique)\(/);
    }
  });

  it("keeps residual ThreatEvent/RiskEvent request writers off the global Prisma client", () => {
    const surfaces = [
      "app/actions/chaosActions.ts",
      "app/actions/attbotActions.ts",
      "app/actions/ironsightActions.ts",
      "app/actions/shredderActions.ts",
      "app/actions/teleportActions.ts",
      "app/utils/tasFingerprint.ts",
      "app/lib/scorchProtocol.ts",
      "app/admin/clearance/page.tsx",
      "app/(dashboard)/admin/clearance/vault/page.tsx",
      "lib/risks.ts",
      "lib/reporting/boardReportQueries.ts",
    ];
    for (const relative of surfaces) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).toContain("withIronguardTenant");
      expect(source).not.toMatch(/prisma\.(threatEvent|riskEvent)\.\w+\(/);
    }
  });

  it("leaves Irontech freeze SystemConfig on the app client (not tenant-RLS)", () => {
    const source = readFileSync(join(REPO_ROOT, "src/services/irontech/freezeEngine.ts"), "utf8");
    expect(source).toContain("prisma.systemConfig.findUnique");
    expect(source).not.toContain("getPrismaPrivileged");
  });

  it("keeps remaining AuditLog request surfaces off the global Prisma client", () => {
    const surfaces = [
      "app/(dashboard)/boardroom/admin/audit-logs/actions.ts",
      "app/audit-logs/page.tsx",
      "app/lib/server/resolveWorkspaceAccessDenial.ts",
      "app/lib/server/ironintelResiliencePollCore.ts",
      "app/utils/notificationAuditSummary.ts",
      "app/lib/security/quarantineTenantTargeting.ts",
      "lib/reporting/boardReportQueries.ts",
      "lib/reporting/certification.ts",
      "app/services/ironscribe/staleDataOutagePostMortem.ts",
      "app/services/irontechPostMortem.ts",
      "app/lib/postMortemEngine.ts",
      "app/lib/lastWillAndTestament.ts",
      "app/api/admin/purge/route.ts",
    ];
    for (const relative of surfaces) {
      const source = readFileSync(join(REPO_ROOT, relative), "utf8");
      expect(source).not.toMatch(/prisma\.auditLog\./);
    }
  });

  it("requires platform admin and per-tenant binds for master purge", () => {
    const source = readFileSync(join(REPO_ROOT, "app/api/admin/purge/route.ts"), "utf8");
    expect(source).toContain("requirePlatformAdministrator");
    expect(source).toContain("withIronguardTenant");
    expect(source).toContain("listCatalogTenantIds");
    expect(source).not.toMatch(/prisma\.auditLog\.deleteMany\(\{\}\)/);
    expect(source).not.toMatch(/prisma\.threatEvent\.deleteMany\(\{\}\)/);
  });

  it("ships a preview NOBYPASSRLS smoke entrypoint", () => {
    const smoke = readFileSync(join(REPO_ROOT, "scripts/preview-rls-nobyypass-smoke.ts"), "utf8");
    const pkg = readFileSync(join(REPO_ROOT, "package.json"), "utf8");
    expect(smoke).toContain("rolbypassrls");
    expect(smoke).toContain("ironguard_set_session_tenant");
    expect(smoke).toContain("unbound connection sees zero tenant ledger rows");
    expect(pkg).toContain('"smoke:rls:preview"');
  });
});
