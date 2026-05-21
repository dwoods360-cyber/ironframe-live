import { describe, expect, it } from "vitest";

import {
  composeMasterSealFromSegments,
  generateMasterEmergencySealHex,
  splitMasterSealForPosture,
} from "@/app/lib/emergencySeal";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
} from "@/app/config/securityPosture";

describe("splitMasterSealForPosture", () => {
  it("splits dual-lock 32+32", () => {
    const master = "a".repeat(32) + "b".repeat(32);
    const segments = splitMasterSealForPosture(master, SECURITY_POSTURE_DUAL_LOCK);
    expect(segments).toEqual({ vault: "a".repeat(32), human: "b".repeat(32) });
    expect(composeMasterSealFromSegments(SECURITY_POSTURE_DUAL_LOCK, segments!)).toBe(master);
  });

  it("splits tripartite-lock 22+21+21", () => {
    const master = "c".repeat(22) + "d".repeat(21) + "e".repeat(21);
    const segments = splitMasterSealForPosture(master, SECURITY_POSTURE_TRIPARTITE_LOCK);
    expect(segments).toEqual({
      vault: "c".repeat(22),
      ciso: "d".repeat(21),
      staff: "e".repeat(21),
    });
    expect(composeMasterSealFromSegments(SECURITY_POSTURE_TRIPARTITE_LOCK, segments!)).toBe(master);
  });

  it("rejects invalid master length", () => {
    expect(splitMasterSealForPosture("abc", SECURITY_POSTURE_DUAL_LOCK)).toBeNull();
    expect(generateMasterEmergencySealHex()).toMatch(/^[a-f0-9]{64}$/);
  });
});
