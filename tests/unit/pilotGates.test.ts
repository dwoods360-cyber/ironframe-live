import { describe, expect, it } from "vitest";

import {
  PILOT_QUALITY_GATES,
  businessHoursBetween,
  evaluateConsecutiveGateBPass,
  evaluateGateBWeek,
  inferFirstActionType,
  isIcpQualifiedConfirmed,
  isIcpQualifiedProxy,
  resolvePilotOperationalMode,
} from "@/lib/crm/pilotGates";

describe("pilotGates", () => {
  it("infers GRC first-action types from interaction summary", () => {
    expect(inferFirstActionType("Opened vendor risk assessment for Acme")).toBe(
      "VENDOR_ASSESSMENT",
    );
    expect(inferFirstActionType("Started control mapping for SOC program")).toBe(
      "CONTROL_MAPPING",
    );
    expect(inferFirstActionType("Sent security questionnaire")).toBe("QUESTIONNAIRE");
    expect(inferFirstActionType("Created remediation work order")).toBe("REMEDIATION");
  });

  it("distinguishes Q-proxy from Q-confirmed", () => {
    expect(isIcpQualifiedProxy(40)).toBe(true);
    expect(
      isIcpQualifiedConfirmed({ priorityScore: 40, evidenceFieldSlots: 2, icpConfirmed: false }),
    ).toBe(false);
    expect(
      isIcpQualifiedConfirmed({ priorityScore: 40, evidenceFieldSlots: 3, icpConfirmed: false }),
    ).toBe(true);
    expect(
      isIcpQualifiedConfirmed({ priorityScore: 40, evidenceFieldSlots: 1, icpConfirmed: true }),
    ).toBe(true);
  });

  it("evaluates Gate B week with all four thresholds", () => {
    const pass = evaluateGateBWeek({
      weekKey: "2026-W27",
      ingested: 10,
      qualifiedProxy: 8,
      qualifiedConfirmed: 4,
      evidenceSum: 650,
      firstActionCount: 2,
      firstActionBusinessHours: [8, 12, 24, 32],
    });
    expect(pass.qualificationRatePct).toBe(40);
    expect(pass.evidenceAvgPct).toBe(65);
    expect(pass.firstActionRateOfQualifiedPct).toBe(50);
    expect(pass.pass).toBe(true);

    const fail = evaluateGateBWeek({
      weekKey: "2026-W28",
      ingested: 10,
      qualifiedProxy: 5,
      qualifiedConfirmed: 2,
      evidenceSum: 400,
      firstActionCount: 0,
      firstActionBusinessHours: [],
    });
    expect(fail.pass).toBe(false);
    expect(fail.failures.length).toBeGreaterThan(0);
  });

  it("requires two consecutive passing ISO weeks", () => {
    const passing = (weekKey: string) =>
      evaluateGateBWeek({
        weekKey,
        ingested: 10,
        qualifiedProxy: 8,
        qualifiedConfirmed: 4,
        evidenceSum: 650,
        firstActionCount: 2,
        firstActionBusinessHours: [8, 12, 24, 32],
      });

    const result = evaluateConsecutiveGateBPass([
      passing("2026-W25"),
      evaluateGateBWeek({
        weekKey: "2026-W26",
        ingested: 0,
        qualifiedProxy: 0,
        qualifiedConfirmed: 0,
        evidenceSum: 0,
        firstActionCount: 0,
        firstActionBusinessHours: [],
      }),
      passing("2026-W27"),
      passing("2026-W28"),
    ]);
    expect(result.consecutiveWeeks).toBe(2);
    expect(result.pass).toBe(true);
  });

  it("keeps SORT_ONLY until Gate B and minimum partner volume", () => {
    expect(
      resolvePilotOperationalMode({
        gateAReady: true,
        consecutiveGateBPass: false,
        totalPartnerLeads: 20,
      }),
    ).toBe("SORT_ONLY");
    expect(
      resolvePilotOperationalMode({
        gateAReady: true,
        consecutiveGateBPass: true,
        totalPartnerLeads: 5,
      }),
    ).toBe("SORT_ONLY");
    expect(
      resolvePilotOperationalMode({
        gateAReady: true,
        consecutiveGateBPass: true,
        totalPartnerLeads: 12,
      }),
    ).toBe("OPERATIONAL_SCALE");
  });

  it("computes business hours excluding weekends", () => {
    const monday = new Date("2026-07-06T14:00:00.000Z");
    const tuesday = new Date("2026-07-07T11:00:00.000Z");
    const hours = businessHoursBetween(monday, tuesday);
    expect(hours).toBeGreaterThan(0);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("documents Gate B threshold constants", () => {
    expect(PILOT_QUALITY_GATES.minQualificationRatePct).toBe(30);
    expect(PILOT_QUALITY_GATES.minEvidenceCompletenessPct).toBe(60);
    expect(PILOT_QUALITY_GATES.minFirstActionRateOfQualifiedPct).toBe(40);
    expect(PILOT_QUALITY_GATES.maxMedianFirstActionBusinessHours).toBe(40);
    expect(PILOT_QUALITY_GATES.consecutiveWeeksRequired).toBe(2);
  });
});
