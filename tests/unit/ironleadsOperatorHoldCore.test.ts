import { describe, expect, it } from "vitest";
import {
  applyOperatorHoldToMetadata,
  buildOperatorHoldRecord,
  clearOperatorHoldFromMetadata,
  isOperatorHoldArchived,
  resolveOperatorHold,
} from "@/app/lib/server/ironleadsOperatorHoldCore";

describe("ironleadsOperatorHoldCore", () => {
  it("builds and resolves operator HOLD records", () => {
    const hold = buildOperatorHoldRecord({
      reason: "OSCAR GRC overlap",
      classification: "channel_competitor",
    });
    expect(hold.classification).toBe("channel_competitor");
    expect(hold.reason).toContain("OSCAR");

    const meta = applyOperatorHoldToMetadata({}, hold);
    expect(isOperatorHoldArchived(meta)).toBe(true);
    expect(resolveOperatorHold(meta)?.classification).toBe("channel_competitor");

    const cleared = clearOperatorHoldFromMetadata(meta);
    expect(isOperatorHoldArchived(cleared)).toBe(false);
  });
});
