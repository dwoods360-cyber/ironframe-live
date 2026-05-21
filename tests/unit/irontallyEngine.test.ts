import { describe, expect, it } from "vitest";

import { getFrameworkControlMappings } from "@/app/config/irontallyFrameworkControls";
import {
  auditLogSatisfiesDirective,
  compileFrameworkFromLogs,
  inferDirectivesFromAuditLog,
} from "@/src/services/compliance/irontallyReadinessCore";

describe("irontallyEngine", () => {
  it("infers orchestration bus directives including Ironquery fingerprint", () => {
    const directives = inferDirectivesFromAuditLog({
      action: "ORCHESTRATION_BUS_CYCLE_SUCCESS",
      justification:
        "Multi-agent bus cycle completed. Ironquery fingerprint: iq-abc123. Irongate DMZ validated.",
    });
    expect(directives.has("irontally")).toBe(true);
    expect(directives.has("ironquery")).toBe(true);
    expect(directives.has("irongate")).toBe(true);
  });

  it("maps ironlock freeze action to ironlock directive", () => {
    expect(
      auditLogSatisfiesDirective(
        { action: "AUTONOMOUS_STATE_FREEZE_TRIGGERED", justification: "Constitutional void" },
        "ironlock",
      ),
    ).toBe(true);
    expect(
      auditLogSatisfiesDirective(
        { action: "AUTONOMOUS_STATE_FREEZE_TRIGGERED", justification: "Constitutional void" },
        "irongate",
      ),
    ).toBe(false);
  });

  it("compiles SOC2 readiness from bus telemetry", () => {
    const logs = [
      {
        id: "log-1",
        action: "ORCHESTRATION_BUS_CYCLE_SUCCESS",
        threatId: "threat-uuid",
        justification:
          "Multi-agent bus cycle completed. Ironquery fingerprint: iq-abc123. Irongate DMZ validated.",
        createdAt: new Date("2026-05-18T12:00:00.000Z"),
      },
    ];
    const summary = compileFrameworkFromLogs("soc2_type2", "SOC2", logs);
    expect(summary.totalControlsMonitored).toBe(
      getFrameworkControlMappings("soc2_type2").length,
    );
    expect(summary.passingControlsCount).toBeGreaterThan(0);
    expect(summary.verifiedEvidenceLogs.some((e) => e.controlId.startsWith("CC6.1"))).toBe(true);
    expect(summary.verifiedEvidenceLogs[0]?.agentSignature).toBe("iq-abc123");
  });
});
