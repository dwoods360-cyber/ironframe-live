import { describe, expect, it } from "vitest";

import { applyOperatorHoldToMetadata, buildOperatorHoldRecord } from "@/app/lib/server/ironleadsOperatorHoldCore";
import {
  IRONLEADS_ACTIVE_BATCH_SIZE,
  isPendingBatchHold,
} from "@/app/lib/server/ironleadsPendingPoolCore";

describe("ironleadsPendingPoolCore", () => {
  it("exports a 20-row active batch cap", () => {
    expect(IRONLEADS_ACTIVE_BATCH_SIZE).toBe(20);
  });

  it("detects pending_batch holds only", () => {
    const pending = applyOperatorHoldToMetadata(
      {},
      buildOperatorHoldRecord({ classification: "pending_batch" }),
    );
    const hold = applyOperatorHoldToMetadata(
      {},
      buildOperatorHoldRecord({ classification: "channel_competitor" }),
    );
    expect(isPendingBatchHold(pending)).toBe(true);
    expect(isPendingBatchHold(hold)).toBe(false);
    expect(isPendingBatchHold({})).toBe(false);
  });
});
