import { beforeEach, describe, expect, it, vi } from "vitest";

const { logThreatActivity } = vi.hoisted(() => ({
  logThreatActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/actions/auditActions", () => ({
  logThreatActivity,
}));

import { writeChaosL4ComplianceTimelineTransaction } from "@/app/utils/chaosL4ComplianceTimeline";
import { CHAOS_DIRECTIVE } from "@/app/config/chaosShadowAudit";

describe("writeChaosL4ComplianceTimelineTransaction", () => {
  beforeEach(() => {
    logThreatActivity.mockClear();
  });

  it("writes immutable compliance timeline row for prod plane", async () => {
    await writeChaosL4ComplianceTimelineTransaction({
      plane: "prod",
      threatId: "threat-abc",
      workPerformed: "Deployed hotfix bundle v2.4.1 and verified SSH sidecar teardown.",
      closedAt: "2026-06-02T12:00:00.000Z",
    });

    expect(logThreatActivity).toHaveBeenCalledTimes(1);
    const [threatId, action, payload, opts] = logThreatActivity.mock.calls[0]!;
    expect(threatId).toBe("threat-abc");
    expect(action).toBe("GRC_PROCESS_THREAT");
    const parsed = JSON.parse(payload as string);
    expect(parsed.event).toBe("COMPLIANCE_TIMELINE_TRANSACTION");
    expect(parsed.directiveId).toBe(CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION);
    expect(parsed.lifecycleStep).toBe("CLOSED_ARCHIVED");
    expect(parsed.immutable).toBe(true);
    expect(opts).toMatchObject({
      operatorId: "IRONFRAME_TECH_SUPPORT",
      isSimulation: false,
      simThreatId: null,
    });
  });

  it("writes shadow sim row with simThreatId", async () => {
    await writeChaosL4ComplianceTimelineTransaction({
      plane: "shadow",
      threatId: "sim-threat-1",
      workPerformed: "Verified recovery on shadow plane drill tenant.",
      closedAt: "2026-06-02T12:05:00.000Z",
    });

    const [, , , opts] = logThreatActivity.mock.calls[0]!;
    expect(opts).toMatchObject({
      operatorId: "IRONFRAME_TECH_SUPPORT",
      isSimulation: true,
      simThreatId: "sim-threat-1",
    });
    expect(logThreatActivity.mock.calls[0]![0]).toBeNull();
  });
});
