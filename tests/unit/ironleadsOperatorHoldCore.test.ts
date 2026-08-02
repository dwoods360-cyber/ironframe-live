import { describe, expect, it } from "vitest";
import {
  applyOperatorHoldToMetadata,
  buildOperatorHoldRecord,
  clearOperatorHoldFromMetadata,
  isOperatorHoldArchived,
  OPERATOR_HOLD_META_KEY,
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

    const meta = applyOperatorHoldToMetadata({ websiteUrl: "https://example.com" }, hold);
    expect(isOperatorHoldArchived(meta)).toBe(true);
    expect(resolveOperatorHold(meta)?.classification).toBe("channel_competitor");

    const cleared = clearOperatorHoldFromMetadata(meta);
    expect(isOperatorHoldArchived(cleared)).toBe(false);
    expect(cleared.websiteUrl).toBe("https://example.com");
    expect(OPERATOR_HOLD_META_KEY in cleared).toBe(false);
  });

  it("supports pending_batch for the directory overflow pool", () => {
    const hold = buildOperatorHoldRecord({ classification: "pending_batch" });
    expect(hold.classification).toBe("pending_batch");
    expect(hold.reason.toLowerCase()).toContain("pending");
    expect(resolveOperatorHold(applyOperatorHoldToMetadata({}, hold))?.classification).toBe(
      "pending_batch",
    );
  });

  it("does not leave operatorHold when merging cleared metadata (regression)", () => {
    const hold = buildOperatorHoldRecord({ classification: "channel_competitor" });
    const nextMeta: Record<string, unknown> = applyOperatorHoldToMetadata({ a: 1 }, hold);
    // Bug pattern: Object.assign(next, cleared) keeps deleted keys on next.
    const cleared = clearOperatorHoldFromMetadata(nextMeta);
    Object.assign(nextMeta, cleared);
    expect(isOperatorHoldArchived(nextMeta)).toBe(true);

    // Correct pattern: replace object contents then delete.
    for (const key of Object.keys(nextMeta)) delete nextMeta[key];
    Object.assign(nextMeta, cleared);
    delete nextMeta[OPERATOR_HOLD_META_KEY];
    expect(isOperatorHoldArchived(nextMeta)).toBe(false);
  });
});
