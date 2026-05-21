import { describe, it, expect, afterEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { TRANSACTION_ABORTED } from "@/src/services/orchestration/forensicFaultInjection";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("Epic 15 — Postgres Saver transactional rollback validation", () => {
  const testThreatId = `test-fault-injection-${uuidv4()}`;
  let testTenantId = uuidv4();

  afterEach(async () => {
    if (!hasDatabase) return;
    await prisma.riskRegistry.deleteMany({
      where: { tenantId: testTenantId, riskEventId: testThreatId },
    });
    try {
      const { postgresCheckpointer } = await import(
        "@/src/services/orchestration/forensicPipelineGraph"
      );
      const cp = await postgresCheckpointer();
      await cp.deleteThread(testThreatId);
    } catch {
      /* thread may not exist */
    }
  });

  it.skipIf(!hasDatabase)(
    "executes atomic rollback when a downstream agent fails (zero registry bleed)",
    async () => {
      const tenantRow = await prisma.tenant.findFirst({ select: { id: true } });
      if (!tenantRow?.id) {
        throw new Error("Epic 15 rollback test requires at least one Tenant row.");
      }
      testTenantId = tenantRow.id;

      const baseline = await prisma.riskRegistry.findFirst({
        where: { tenantId: testTenantId, riskEventId: testThreatId },
      });
      expect(baseline).toBeNull();

      const { compileOrchestrationGraphWithCheckpoint, postgresCheckpointer } = await import(
        "@/src/services/orchestration/forensicPipelineGraph",
      );
      const graph = await compileOrchestrationGraphWithCheckpoint();
      const cp = await postgresCheckpointer();

      const brokenPayload = {
        threatId: testThreatId,
        tenantId: testTenantId,
        rawPayload: {
          tenant_id: testTenantId,
          source_type: "API",
          raw_data: {
            kwh: 5000,
            force_downstream_crash: true,
          },
        },
        historyLogs: [] as Array<{ agentId: string; timestamp: string; message: string }>,
      };

      const config = { configurable: { thread_id: testThreatId } };

      let caught: Error | null = null;
      try {
        await graph.invoke(brokenPayload, config);
      } catch (error) {
        caught = error instanceof Error ? error : new Error(String(error));
      }

      expect(caught).not.toBeNull();
      expect(caught!.message).toMatch(new RegExp(TRANSACTION_ABORTED, "i"));

      const validationRecord = await prisma.riskRegistry.findFirst({
        where: { tenantId: testTenantId, riskEventId: testThreatId },
      });
      expect(validationRecord).toBeNull();

      const checkpointTuple = await cp.getTuple(config);
      if (checkpointTuple) {
        const nextSerialized = JSON.stringify(checkpointTuple.metadata ?? {});
        expect(nextSerialized).not.toContain("persist");
      }

      const graphState = await graph.getState(config);
      expect(graphState.values.currentAssignee).not.toBe("Agent_05_Ironscribe");
      expect(graphState.next).not.toContain("persist");
    },
    45_000,
  );
});
