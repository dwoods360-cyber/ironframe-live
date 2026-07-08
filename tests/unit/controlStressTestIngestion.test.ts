import { describe, expect, it } from "vitest";

import { isControlStressTestIngestion } from "@/app/utils/controlStressTestIngestion";

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
