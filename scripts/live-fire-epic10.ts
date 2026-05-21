import { graph } from "../src/services/orchestration/graph";
import { v4 as uuidv4 } from "uuid";

async function runTest() {
  const threadId = `test-thread-${uuidv4()}`;
  const tenantId = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";

  console.log(`🚀 Initializing Live-Fire for Thread: ${threadId}`);

  const input = {
    tenant_id: tenantId,
    raw_payload: {
      type: "MIXED_SIGNAL",
      text: "Invoice: $12,500 USD for 500 Liters of specialized chemical coolant.",
      mitigatedValueCents: "1250000",
    },
    processed_agents: [],
    metadata: { tenantId },
  };

  const config = { configurable: { thread_id: threadId, tenant_id: tenantId } };

  // This calls the real Gemini-2.0-Flash model and the real Prisma Checkpointer
  const result = await graph.invoke(input, config);

  console.log("--- FINAL GRAPH STATE ---");
  console.log(result);
  console.log("Processed Agents:", result.processed_agents);
  console.log("Status:", result.status);
  if (
    Array.isArray(result.processed_agents) &&
    result.processed_agents.includes("IRONTRUST") &&
    result.processed_agents.includes("IRONBLOOM")
  ) {
    console.log("SUCCESS: Mixed-signal routing completed (IRONTRUST + IRONBLOOM).");
  } else {
    console.log("FAILURE: Expected processed_agents to include IRONTRUST and IRONBLOOM.");
  }
}

runTest().catch(console.error);
