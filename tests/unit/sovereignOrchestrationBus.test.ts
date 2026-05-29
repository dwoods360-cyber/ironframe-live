import { describe, expect, it, vi } from "vitest";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("compileSovereignOrchestrationBus", () => {
  it(
    "compiles the Epic 10 workforce bus graph",
    async () => {
      vi.stubEnv("GOOGLE_API_KEY", "test-compile-key");
      try {
        const { compileSovereignOrchestrationBus } = await import(
          "@/src/services/orchestration/graph"
        );
        const graph = await compileSovereignOrchestrationBus();
        expect(graph).toBeDefined();
        expect(typeof graph.invoke).toBe("function");
      } finally {
        vi.unstubAllEnvs();
      }
    },
    20_000,
  );

  it.skipIf(!hasDatabase)(
    "routes low health through ironlock to ironcast and writes bus audit row",
    async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      const { v4: uuidv4 } = await import("uuid");
      const { compileSovereignOrchestrationBus } = await import(
        "@/src/services/orchestration/graph"
      );
      const prisma = (await import("@/lib/prisma")).default;

      const tenantId = uuidv4();
      const threadId = uuidv4();
      const graph = await compileSovereignOrchestrationBus();

      const result = await graph.invoke(
        {
          tenant_id: tenantId,
          raw_payload: {
            type: "DOCUMENT_ANALYSIS",
            text: "Vendor invoice $10.00 for Medshield baseline audit.",
            healthBarPercent: 35,
          },
          status: "PENDING" as const,
        },
        { configurable: { thread_id: threadId } },
      );

      expect(result.current_agent).toBe("END");
      expect(result.status).toBe("COMPLETED");
      expect(result.ironquery_summary_signature?.length).toBeGreaterThan(0);
      expect(
        (result.agent_logs ?? []).some((l: string) => l.includes("Ironquery")),
      ).toBe(true);

      const audit = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: "ORCHESTRATION_BUS_CYCLE_SUCCESS",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(audit?.operatorId).toBe("SYSTEM_ORCHESTRATOR_BUS");
    },
  );
});
