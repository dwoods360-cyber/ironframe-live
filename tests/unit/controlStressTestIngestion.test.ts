import { describe, expect, it } from "vitest";

import { isControlStressTestIngestion, requiresForensicNeutralizeClosure } from "@/app/utils/controlStressTestIngestion";

describe("isControlStressTestIngestion", () => {
  it("detects controlStressTest flag on ingestionDetails", () => {
    expect(
      isControlStressTestIngestion(
        JSON.stringify({
          controlStressTest: true,
          threadId: "thread-1",
        }),
      ),
    ).toBe(true);
  });

  it("detects legacy sentinelIntake verificationPhaseRequired", () => {
    expect(
      isControlStressTestIngestion(
        JSON.stringify({
          sentinelIntake: { verificationPhaseRequired: true },
        }),
      ),
    ).toBe(true);
  });

  it("returns false for unrelated ingestion payloads", () => {
    expect(isControlStressTestIngestion(JSON.stringify({ source: "scout" }))).toBe(false);
    expect(isControlStressTestIngestion(null)).toBe(false);
    expect(isControlStressTestIngestion(undefined)).toBe(false);
  });
});

describe("requiresForensicNeutralizeClosure", () => {
  it("matches control-stress / evidence readiness ingestion", () => {
    expect(
      requiresForensicNeutralizeClosure(
        JSON.stringify({
          controlStressTest: true,
          sentinelIntake: { verificationPhaseRequired: true },
        }),
      ),
    ).toBe(true);
    expect(requiresForensicNeutralizeClosure(JSON.stringify({ source: "scout" }))).toBe(false);
  });
});
