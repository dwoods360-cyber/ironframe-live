/**
 * Live-fire harness — uses sovereign bus (`compileSovereignOrchestrationBus`).
 * Run: npx tsx scripts/live-fire-epic10.ts
 */
import { v4 as uuidv4 } from "uuid";

async function runTest() {
  const { compileSovereignOrchestrationBus } = await import(
    "../src/services/orchestration/graph"
  );
  const bus = await compileSovereignOrchestrationBus();
  const tenantId = process.env.TEST_TENANT_ID ?? "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
  const threadId = `test-thread-${uuidv4()}`;

  console.log(`Live-fire sovereign bus — thread ${threadId}`);

  const result = await bus.invoke(
    {
      tenant_id: tenantId,
      raw_payload: {
        type: "MIXED_SIGNAL",
        text: "Invoice: $12,500 USD for 500 Liters of specialized chemical coolant.",
      },
      health_bar_percent: 85,
    },
    { configurable: { thread_id: threadId } },
  );

  console.log("--- FINAL GRAPH STATE ---");
  console.log(result);
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
