import { describe, it, expect } from "vitest";
import { parseIroncastNotificationFromAudit } from "@/app/utils/ironcastNotificationBridge";

describe("ironcastNotificationBridge", () => {
  it("builds L6 ransomware intercept toast from Irongate audit line", () => {
    const toast = parseIroncastNotificationFromAudit({
      action_type: "SECURITY_THREAT_INTERCEPTED",
      description:
        "[Irongate] [AGENT-14] Boundary scan anomaly detected: High-frequency cryptographic lock signature caught.",
      metadata_tag: "IRONTECH_CHAOS_L6|IRONGATE|SECURITY_THREAT_INTERCEPTED",
      log_type: "GRC",
    });
    expect(toast).not.toBeNull();
    expect(toast!.threatDetected).toContain("IRONCHAOS");
    expect(toast!.threatDetected).toContain("RANSOMWARE");
    expect(toast!.agentAction).toMatch(/\[Irongate\]/i);
  });

  it("builds Ironlock containment toast with semantic action copy", () => {
    const toast = parseIroncastNotificationFromAudit({
      action_type: "INTERRUPT_CONTAINMENT_DEPLOYED",
      description:
        "[Ironlock] Priority Interrupt Authority deployed: Execution thread frozen. Containment sandbox active.",
      metadata_tag: "IRONTECH_CHAOS_L6|IRONLOCK|INTERRUPT_CONTAINMENT_DEPLOYED",
      log_type: "GRC",
    });
    expect(toast).not.toBeNull();
    expect(toast!.agentAction).toContain("[Ironlock]");
    expect(toast!.agentAction.toLowerCase()).toContain("containment");
    expect(toast!.severity).toBe("critical");
  });

  it("ignores non block-level audit actions", () => {
    const toast = parseIroncastNotificationFromAudit({
      action_type: "NOTE_ADDED",
      description: "Analyst note",
    });
    expect(toast).toBeNull();
  });
});
