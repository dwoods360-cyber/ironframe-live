import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { withThreatEventWormBypass } from "@/app/lib/prisma/threatEventWormBypass";
import { evaluateSystemTriage } from "@/src/services/irontech/triageRouter";
import { ensureTriageThreadCheckpoint } from "@/src/services/irontech/healthPostureMonitor";
import * as Agent17SentinelCron from "@/app/api/internal/cron/agent17-sentinel/route";
import * as CarbonBudgetCron from "@/app/api/internal/cron/carbon-budget-reallocation/route";
import * as GridcoreRatePollCron from "@/app/api/internal/cron/gridcore-rate-poll/route";
import * as HealthPostureCron from "@/app/api/internal/cron/health-posture-triage/route";
import * as IndustryScoutCron from "@/app/api/internal/cron/industry-scout/route";
import * as IronscribeDailyAuditCron from "@/app/api/internal/cron/ironscribe-daily-audit/route";
import * as IronsightRegulatoryCron from "@/app/api/internal/cron/ironsight-regulatory-poll/route";
import * as IronwatchApiHeartbeatCron from "@/app/api/internal/cron/ironwatch-api-heartbeat/route";
import * as IronwatchSecurityCron from "@/app/api/internal/cron/ironwatch-security-monitor/route";
import * as SustainabilityAchievementCron from "@/app/api/internal/cron/sustainability-achievement-report/route";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

type CronRouteModule = {
  GET?: (request: Request) => Promise<Response>;
  POST?: (request: Request) => Promise<Response>;
};

const CRON_PERIMETER_ROUTES: Array<{ slug: string; mod: CronRouteModule }> = [
  { slug: "agent17-sentinel", mod: Agent17SentinelCron },
  { slug: "carbon-budget-reallocation", mod: CarbonBudgetCron },
  { slug: "gridcore-rate-poll", mod: GridcoreRatePollCron },
  { slug: "health-posture-triage", mod: HealthPostureCron },
  { slug: "industry-scout", mod: IndustryScoutCron },
  { slug: "ironscribe-daily-audit", mod: IronscribeDailyAuditCron },
  { slug: "ironsight-regulatory-poll", mod: IronsightRegulatoryCron },
  { slug: "ironwatch-api-heartbeat", mod: IronwatchApiHeartbeatCron },
  { slug: "ironwatch-security-monitor", mod: IronwatchSecurityCron },
  { slug: "sustainability-achievement-report", mod: SustainabilityAchievementCron },
];

function buildUnauthenticatedCronGet(slug: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/internal/cron/${slug}`, {
    method: "GET",
  });
}

describe("Epic 13 - Telemetry Cron Perimeter Guard Rails", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.IRONFRAME_CRON_SECRET = "test-cron-secret";
  });

  for (const route of CRON_PERIMETER_ROUTES) {
    it(`should enforce strict HTTP 401 fail-closed posture on /api/internal/cron/${route.slug} without Bearer token`, async () => {
      expect(route.mod.GET).toBeDefined();
      const res = await route.mod.GET!(buildUnauthenticatedCronGet(route.slug));
      expect(res.status).toBe(401);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.error).toBe("Unauthorized");
    });
  }
});

describe("Epic 13 — Active telemetry triage (TAS §4.3)", () => {
  let testTenantId = "";
  let mockThread = "";
  let registryFixtureId: string | null = null;
  let threatFixtureId: string | null = null;
  let priorStateFreezeActive: boolean | null = null;

  afterEach(async () => {
    if (!hasDatabase || !testTenantId) return;

    if (registryFixtureId) {
      await prisma.riskRegistry.deleteMany({ where: { id: registryFixtureId } });
      registryFixtureId = null;
    }

    if (threatFixtureId) {
      await prisma.auditLog.deleteMany({ where: { threatId: threatFixtureId } });
      await withThreatEventWormBypass(async (tx) => {
        await tx.threatEvent.deleteMany({ where: { id: threatFixtureId! } });
      });
      threatFixtureId = null;
    }

    if (priorStateFreezeActive !== null) {
      await prisma.systemConfig.upsert({
        where: { id: "global" },
        update: { stateFreezeActive: priorStateFreezeActive },
        create: { id: "global", stateFreezeActive: priorStateFreezeActive },
      });
    }

    if (mockThread) {
      try {
        const { getPostgresCheckpointer } = await import(
          "@/src/services/orchestration/checkpointer"
        );
        const cp = await getPostgresCheckpointer();
        await cp.deleteThread(mockThread);
      } catch {
        /* thread may not exist */
      }
    }
  });

  it.skipIf(!hasDatabase)(
    "freezes pipelines and stamps Agent 12 registry isolation when health is below 50%",
    async () => {
      const tenantRow = await prisma.tenant.findFirst({
        select: { id: true },
        orderBy: { id: "asc" },
      });
      if (!tenantRow?.id) {
        throw new Error("Epic 13 triage test requires at least one Tenant row.");
      }
      testTenantId = tenantRow.id;

      await prisma.systemConfig.upsert({
        where: { id: "global" },
        update: {},
        create: { id: "global", stateFreezeActive: false },
      });

      const globalCfg = await prisma.systemConfig.findUnique({
        where: { id: "global" },
        select: { stateFreezeActive: true },
      });
      priorStateFreezeActive = globalCfg?.stateFreezeActive ?? false;

      const threat = await prisma.threatEvent.create({
        data: {
          title: `Epic 13 triage fixture ${uuidv4().slice(0, 8)}`,
          sourceAgent: "IRONWATCH",
          score: 42,
          targetEntity: "telemetry-plane",
        },
      });
      threatFixtureId = threat.id;
      mockThread = threat.id;

      await ensureTriageThreadCheckpoint(testTenantId, mockThread);

      const fixture = await prisma.riskRegistry.create({
        data: {
          tenantId: testTenantId,
          title: "Epic 13 telemetry triage fixture",
          riskEventId: mockThread,
          lifecycleStatus: "ACTIVE",
          sourceAgent: "SYSTEM",
          deltaLabel: "pre-triage active",
          ingestionDetails: { fixture: true },
        },
      });
      registryFixtureId = fixture.id;

      const outcome = await evaluateSystemTriage({
        tenantId: testTenantId,
        threadId: mockThread,
        healthBarPercent: 42,
        incidentZone: "TELEMETRY_DROP",
      });

      expect(outcome.status).toBe("TRIAGED_AND_HEALED");
      if (outcome.status !== "TRIAGED_AND_HEALED") return;

      expect(outcome.checkpointId).toBeTruthy();
      expect(outcome.incidentZone).toBe("TELEMETRY_DROP");
      expect(outcome.ironlockInterruptArmed).toBe(true);
      expect(outcome.registryRowsUpdated).toBeGreaterThan(0);

      const frozenCfg = await prisma.systemConfig.findUnique({
        where: { id: "global" },
        select: { stateFreezeActive: true },
      });
      expect(frozenCfg?.stateFreezeActive).toBe(true);

      const registered = await prisma.riskRegistry.findUnique({
        where: { id: fixture.id },
      });
      expect(registered).not.toBeNull();
      // Ironguard uses REGISTERED + triage JSON — not a QUARANTINED enum (schema has no such value).
      expect(registered!.lifecycleStatus).toBe("REGISTERED");
      expect(registered!.sourceAgent).toBe("Agent_12_Irontech");
      expect(registered!.deltaLabel).toContain("TAS §4.3");

      const details =
        registered!.ingestionDetails == null
          ? {}
          : typeof registered!.ingestionDetails === "string"
            ? (JSON.parse(registered!.ingestionDetails) as Record<string, unknown>)
            : (registered!.ingestionDetails as Record<string, unknown>);

      const triageStamp = details.tasSelfHealingTriage as Record<string, unknown> | undefined;
      expect(triageStamp?.status).toBe("OPERATIONAL_FREEZE_LOCKED");
      expect(triageStamp?.incidentZone).toBe("TELEMETRY_DROP");
      expect(triageStamp?.checkpointId).toBe(outcome.checkpointId);

      const auditRows = await prisma.auditLog.findMany({
        where: {
          tenantId: testTenantId,
          threatId: mockThread,
          action: { in: ["CONFIG_DEGRADATION_EVENT", "AUTONOMOUS_STATE_FREEZE_TRIGGERED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      expect(auditRows.length).toBeGreaterThan(0);
    },
    45_000,
  );
});
