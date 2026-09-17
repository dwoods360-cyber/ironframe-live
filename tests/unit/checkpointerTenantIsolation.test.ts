import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasLlmKey = Boolean(process.env.GOOGLE_API_KEY);
const runLiveOrchestration =
  hasDatabase &&
  hasLlmKey &&
  (!process.env.GITHUB_ACTIONS || process.env.RUN_LIVE_GRAPH_TESTS === "1");

describe("Postgres checkpointer tenant isolation", () => {
  it.skipIf(!runLiveOrchestration)("rejects checkpoint tenant stamp mismatch", async () => {
    const { getTenantBoundCheckpointTuple } = await import(
      "@/src/services/orchestration/checkpointer",
    );
    const { composeCheckpointThreadId } = await import(
      "@/src/services/orchestration/checkpointTenant",
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

    await expect(getTenantBoundCheckpointTuple(threadId, tenantId)).resolves.toMatchObject({
      checkpoint: { channel_values: expect.objectContaining({ tenant_id: tenantId.toLowerCase() }) },
    });
    await expect(getTenantBoundCheckpointTuple(threadId, uuidv4())).resolves.toBeNull();
    await expect(
      getTenantBoundCheckpointTuple(composeCheckpointThreadId(tenantId, threadId), uuidv4()),
    ).rejects.toThrow(/CRITICAL_TENANT_VIOLATION/);
  });
});
