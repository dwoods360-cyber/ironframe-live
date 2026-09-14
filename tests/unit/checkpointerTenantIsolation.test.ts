import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { assertCheckpointTenant } from "@/src/services/orchestration/checkpointer";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const runLiveOrchestration =
  hasDatabase &&
  (!process.env.GITHUB_ACTIONS || process.env.RUN_LIVE_GRAPH_TESTS === "1");

describe("Postgres checkpointer tenant isolation", () => {
  it("rejects checkpoints with no tenant ownership stamp", () => {
    expect(() => assertCheckpointTenant({}, uuidv4(), "Legacy checkpoint")).toThrow(
      /has no tenant ownership stamp/i,
    );
  });

  it("accepts only the expected tenant stamp", () => {
    const tenantId = uuidv4();
    expect(assertCheckpointTenant({ tenant_id: tenantId }, tenantId)).toBe(tenantId);
    expect(assertCheckpointTenant({ tenantId }, tenantId)).toBe(tenantId);
    expect(() => assertCheckpointTenant({ tenant_id: uuidv4() }, tenantId)).toThrow(
      /CRITICAL_TENANT_VIOLATION/i,
    );
  });

  it.skipIf(!runLiveOrchestration)("rejects checkpoint tenant stamp mismatch", async () => {
    const { getTenantBoundCheckpointTuple } = await import(
      "@/src/services/orchestration/checkpointer",
    );
    const { createSovereignGraph } = await import("@/src/services/orchestration/graph");
    const graph = await createSovereignGraph();
    const tenantId = uuidv4();
    const threadId = uuidv4();

    await graph.invoke(
      {
        tenant_id: tenantId,
        raw_payload: { type: "FINANCIAL_AUDIT", amount_cents: 100 },
        status: "PENDING" as const,
      },
      { configurable: { thread_id: threadId } },
    );

    await expect(getTenantBoundCheckpointTuple(threadId, uuidv4())).rejects.toThrow(
      /CRITICAL_TENANT_VIOLATION/i,
    );
  });
});
