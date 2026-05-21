import { describe, expect, it } from "vitest";

import {
  buildGovernanceAlertMessage,
  formatPostureDegradationCountdown,
} from "@/app/config/postureDegradation";

describe("postureDegradationCountdown", () => {
  it("formats HH:MM:SS countdown", () => {
    expect(formatPostureDegradationCountdown(24 * 60 * 60 * 1000 - 1000)).toBe("23:59:59");
    expect(formatPostureDegradationCountdown(0)).toBe("00:00:00");
  });

  it("builds governance alert message", () => {
    const msg = buildGovernanceAlertMessage(24 * 60 * 60 * 1000);
    expect(msg).toContain("[GOVERNANCE ALERT]");
    expect(msg).toContain("DUAL_LOCK");
    expect(msg).toContain("CEO, CFO, CIO");
  });
});
