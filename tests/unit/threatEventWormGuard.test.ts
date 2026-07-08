import { describe, expect, it } from "vitest";
import {
  EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE,
  assertThreatEventWormMutationPermitted,
  isBlockedThreatEventWormAction,
  runWithThreatEventWormBypassScope,
  threatEventWormGuardActive,
} from "@/app/lib/evidence/threatEventWormGuard.server";
import { getLiveDoraReadinessScore } from "@/app/lib/board/sharedBoardContext";

describe("threatEventWormGuard", () => {
  it("blocks update and delete actions when guard is conceptually active", () => {
    expect(isBlockedThreatEventWormAction("update")).toBe(true);
    expect(isBlockedThreatEventWormAction("deleteMany")).toBe(true);
    expect(isBlockedThreatEventWormAction("create")).toBe(false);
    expect(isBlockedThreatEventWormAction("findMany")).toBe(false);
  });

  it("throws the DORA Pillar 5 compliance message when enforced", () => {
    const prev = process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED;
    process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED = "1";
    try {
      expect(threatEventWormGuardActive()).toBe(true);
      expect(() => assertThreatEventWormMutationPermitted("update")).toThrow(
        EPIC_12_THREAT_EVENT_WORM_VIOLATION_MESSAGE,
      );
    } finally {
      if (prev === undefined) delete process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED;
      else process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED = prev;
    }
  });

  it("permits blocked actions inside the async bypass scope", async () => {
    const prev = process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED;
    process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED = "1";
    try {
      await runWithThreatEventWormBypassScope(async () => {
        expect(() => assertThreatEventWormMutationPermitted("delete")).not.toThrow();
      });
    } finally {
      if (prev === undefined) delete process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED;
      else process.env.IRONFRAME_WORM_THREAT_EVENT_ENFORCED = prev;
    }
  });
});

describe("getLiveDoraReadinessScore", () => {
  it("returns 100 after Epic 12/16 delivery", () => {
    expect(getLiveDoraReadinessScore()).toBe(100);
  });
});
