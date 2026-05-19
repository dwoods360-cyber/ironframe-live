import { describe, expect, it } from "vitest";
import {
  IRONWATCH_CHECK_INTERVAL_MS,
  IRONWATCH_MIN_CONSECUTIVE_FAILURES,
  IRONWATCH_STALE_DATA_THRESHOLD_MS,
} from "@/src/services/ironwatch/apiHeartbeat";

describe("Ironwatch apiHeartbeat", () => {
  it("requires 16 consecutive 15m failures to reach 4h stale threshold", () => {
    expect(IRONWATCH_CHECK_INTERVAL_MS).toBe(15 * 60 * 1000);
    expect(IRONWATCH_STALE_DATA_THRESHOLD_MS).toBe(4 * 60 * 60 * 1000);
    expect(IRONWATCH_MIN_CONSECUTIVE_FAILURES).toBe(16);
  });
});
