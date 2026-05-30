import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { v4 as uuidv4 } from "uuid";

const hasDatabase = Boolean(process.env.DATABASE_URL);

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/src/services/orchestration/checkpointer", () => ({
  getPostgresCheckpointer: vi.fn().mockResolvedValue(undefined),
}));

describe("compileSovereignOrchestrationBus", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_API_KEY", "test-compile-key");
    vi.stubEnv("RESEND_API_KEY", "");
    delete process.env.THREAT_CONFIRMATION_RECIPIENTS;
    delete process.env.IRONCAST_SMOKE_RECIPIENT;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it(
    "compiles the Epic 10 workforce bus graph",
    async () => {
      const { compileSovereignOrchestrationBus } = await import(
        "@/src/services/orchestration/graph"
      );
      const graph = await compileSovereignOrchestrationBus();
      expect(graph).toBeDefined();
      expect(typeof graph.invoke).toBe("function");
    },
    20_000,
  );

  it(
    "routes high health cleanly through ironquery to ironcast and skips ironlock quarantine",
    async () => {
      const { compileSovereignOrchestrationBus } = await import(
        "@/src/services/orchestration/graph"
      );
      const graph = await compileSovereignOrchestrationBus();
      const tenantId = uuidv4();

      const result = await graph.invoke(
        {
          tenant_id: tenantId,
          raw_payload: {
            telemetryType: "VULNERABILITY",
            assetValueCents: 2500,
            healthBarPercent: 95,
          },
          status: "PENDING" as const,
        },
        { configurable: { thread_id: uuidv4() } },
      );

      const logs = (result.agent_logs ?? []).join("\n");
      expect(result.current_agent).toBe("END");
      expect(result.status).toBe("COMPLETED");
      expect(result.ironquery_summary_signature?.length).toBeGreaterThan(0);
      expect(logs).toContain("Ironquery");
      expect(logs).toContain("Ironcast");
      expect(logs).not.toMatch(/Agent 6 — Ironlock/i);
      expect(logs).not.toContain("Quarantine path engaged");
    },
    20_000,
  );

  it(
    "intercepts an ironscribe failure state and executes a fail-closed early termination to END",
    async () => {
      vi.doMock("@/src/services/agents/ironscribe", () => ({
        IronScribe: {
          extract: vi.fn().mockResolvedValue({
            current_agent: "END",
            status: "FAILED",
            agent_logs: ["Ironscribe failed: LLM extraction error or schema violation."],
          }),
        },
      }));

      vi.resetModules();
      const { compileSovereignOrchestrationBus } = await import(
        "@/src/services/orchestration/graph"
      );
      const graph = await compileSovereignOrchestrationBus();

      const result = await graph.invoke(
        {
          tenant_id: uuidv4(),
          raw_payload: {
            type: "DOCUMENT_ANALYSIS",
            text: "<<MALFORMED_UNPARSEABLE_CONTEXT>>",
            healthBarPercent: 95,
          },
          status: "PENDING" as const,
        },
        { configurable: { thread_id: uuidv4() } },
      );

      const logs = (result.agent_logs ?? []).join("\n");
      expect(result.status).toBe("FAILED");
      expect(result.current_agent).toBe("END");
      expect(logs).toMatch(/Ironscribe/i);
      expect(logs).toMatch(/bus halted|failed/i);
      expect(logs).not.toMatch(/Agent 8 — Ironsight/i);
      expect(logs).not.toMatch(/Agent 15 — Ironquery/i);

      vi.doUnmock("@/src/services/agents/ironscribe");
      vi.resetModules();
    },
    20_000,
  );

  it(
    "logs a graceful communication warning when RESEND_API_KEY is empty during terminal batch audit",
    async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      vi.stubEnv("IRONCAST_SMOKE_RECIPIENT", "ops@ironframe.test");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { compileSovereignOrchestrationBus } = await import(
        "@/src/services/orchestration/graph"
      );
      const graph = await compileSovereignOrchestrationBus();

      const result = await graph.invoke(
        {
          tenant_id: uuidv4(),
          raw_payload: {
            telemetryType: "VULNERABILITY",
            assetValueCents: 1500,
            healthBarPercent: 95,
          },
          status: "PENDING" as const,
        },
        { configurable: { thread_id: uuidv4() } },
      );

      const logs = (result.agent_logs ?? []).join("\n");
      expect(result.current_agent).toBe("END");
      expect(result.status).toBe("COMPLETED");
      expect(logs).toContain("RESEND_API_KEY absent");
      expect(logs).toContain("graceful fallback");
      expect(
        warnSpy.mock.calls.some((c) =>
          String(c[0]).includes("RESEND_API_KEY absent"),
        ),
      ).toBe(true);

      warnSpy.mockRestore();
    },
    20_000,
  );

  it.skipIf(!hasDatabase)(
    "routes low health through ironlock to ironcast and writes bus audit row",
    async () => {
      vi.stubEnv("RESEND_API_KEY", "");
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
