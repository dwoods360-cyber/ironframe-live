import { describe, it, expect, afterEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { evaluateSystemTriage } from "@/src/services/irontech/triageRouter";
import { ensureTriageThreadCheckpoint } from "@/src/services/irontech/healthPostureMonitor";

const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());

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
      await prisma.threatEvent.deleteMany({ where: { id: threatFixtureId } });
      threatFixtureId = null;
    }

    if (priorStateFreezeActive !== null) {
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: { stateFreezeActive: priorStateFreezeActive },
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
