import { describe, expect, it } from "vitest";
import {
  ingestOrchestrationBusDisabled,
  invokeIngestOrchestrationBus,
} from "@/src/services/orchestration/ingestBusBridge";

describe("ingestBusBridge", () => {
  it("honors skipOrchestrationBus on payload", () => {
    expect(ingestOrchestrationBusDisabled({ skipOrchestrationBus: true })).toBe(true);
    expect(ingestOrchestrationBusDisabled({ skipOrchestrationBus: "1" })).toBe(true);
    expect(ingestOrchestrationBusDisabled({})).toBe(
      process.env.IRONFRAME_INGEST_BUS_DISABLED === "1",
    );
  });

  it("returns error when tenant or threat id missing", async () => {
    const result = await invokeIngestOrchestrationBus({
      tenantId: "",
      threatId: "abc",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("MISSING_TENANT_OR_THREAT_ID");
  });
});
