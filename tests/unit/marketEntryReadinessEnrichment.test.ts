import { describe, expect, it } from "vitest";

import {
  formatMarketEntryReadinessEnrichment,
  parseMarketEntryReadinessFromTelemetry,
} from "../../Ironboard/src/services/marketEntryReadinessEnrichment.js";

describe("marketEntryReadinessEnrichment", () => {
  it("parses marketEntryReadiness from shared-context JSON", () => {
    const telemetry = JSON.stringify({
      tenantId: "tenant-1",
      marketEntryReadiness: {
        goldenPathConsecutivePasses: 0,
        currentRunId: "run2",
        lastExecutedStop: "STOP_3_ALE_COMMITTED",
        gateBlockers: ["BILLING_STATUS_PENDING"],
        activeScopeFreeze: true,
        registrationPosture: "sales-assisted-pilot",
        ingestedLiveProspectsCount: 3,
      },
    });

    const parsed = parseMarketEntryReadinessFromTelemetry(telemetry);
    expect(parsed?.currentRunId).toBe("run2");
    expect(parsed?.ingestedLiveProspectsCount).toBe(3);
  });

  it("formats persona gating for blocked airworthiness", () => {
    const text = formatMarketEntryReadinessEnrichment({
      goldenPathConsecutivePasses: 0,
      currentRunId: "run2",
      lastExecutedStop: "STOP_3_ALE_COMMITTED",
      gateBlockers: ["BILLING_STATUS_PENDING"],
      activeScopeFreeze: true,
      registrationPosture: "sales-assisted-pilot",
      ingestedLiveProspectsCount: 3,
    });
    expect(text).toContain("board-pm");
    expect(text).toContain("BILLING_STATUS_PENDING");
    expect(text).toContain("Forbidden: citing");
    expect(text).not.toMatch(/Target Webster Financial/i);
  });
});
