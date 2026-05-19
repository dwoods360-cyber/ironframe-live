import { describe, expect, it } from "vitest";
import {
  isChaosForensicClosureLingerActive,
  parseChaosDrillResolutionAt,
} from "@/app/utils/chaosForensicClosure";
import { mergeAssignmentHistoryEntries } from "@/app/utils/assignmentChainOfCustody";

describe("chaosForensicClosure", () => {
  it("reads chaosDrillResolutionAt from ingestion JSON", () => {
    const at = "2026-05-18T20:31:57.788Z";
    const raw = JSON.stringify({ chaosDrillResolutionAt: at, isChaosTest: true });
    expect(parseChaosDrillResolutionAt(raw)).toBe(at);
    expect(isChaosForensicClosureLingerActive(raw, Date.parse(at) + 2000)).toBe(true);
    expect(isChaosForensicClosureLingerActive(raw, Date.parse(at) + 5000)).toBe(false);
  });
});

describe("mergeAssignmentHistoryEntries", () => {
  it("prefers audit trail over duplicate chaos handoff JSON", () => {
    const ingestion = JSON.stringify({
      isChaosTest: true,
      chaosAssigneeHandoffHistory: [
        {
          at: "2026-05-18T20:30:21.612Z",
          phase: "T0_DMZ_IRONGATE",
          assigneeId: "IRONGATE_14",
          assigneeLabel: "Irongate (Agent 14)",
          directiveId: "DMZ_IRONGATE_SANITIZE_STAMP_TENANT",
        },
      ],
    });
    const audit = [
      {
        id: "audit-1",
        action: "ASSIGNEE_CHANGE",
        justification: JSON.stringify({
          newAssignee: "Irongate (Agent 14) · Sensing & Sanitization",
          actor: "Irongate (Agent 14)",
          actorId: "IRONGATE_14",
          timestamp: "2026-05-18T20:30:21.612Z",
          phase: "T0_DMZ_IRONGATE",
        }),
        operatorId: "IRONGATE_14",
        createdAt: "2026-05-18T20:30:21.612Z",
      },
    ];
    const merged = mergeAssignmentHistoryEntries(audit, ingestion);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("audit-1");
  });

  it("keeps human claim/reassign rows alongside chaos handoffs", () => {
    const ingestion = JSON.stringify({
      isChaosTest: true,
      chaosAssigneeHandoffHistory: [
        {
          at: "2026-05-18T20:30:00.000Z",
          phase: "T4_REMEDIATION_IRONTECH",
          assigneeId: "IRONTECH_11",
          assigneeLabel: "Irontech (Agent 11)",
          directiveId: "T4_ANALYSIS",
        },
      ],
    });
    const humanClaim = {
      id: "audit-claim",
      action: "ASSIGNEE_CHANGE",
      justification: JSON.stringify({
        newAssignee: "Dereck",
        actor: "Dereck",
        actorId: "dereck",
        timestamp: "2026-05-18T20:31:00.000Z",
      }),
      operatorId: "dereck",
      createdAt: "2026-05-18T20:31:00.000Z",
    };
    const humanDispatch = {
      id: "audit-dispatch",
      action: "ASSIGNEE_CHANGE",
      justification: JSON.stringify({
        newAssignee: "SecOps Team",
        actor: "Dereck",
        actorId: "dereck",
        timestamp: "2026-05-18T20:31:05.000Z",
      }),
      operatorId: "dereck",
      createdAt: "2026-05-18T20:31:05.000Z",
    };
    const merged = mergeAssignmentHistoryEntries([humanClaim, humanDispatch], ingestion);
    expect(merged).toHaveLength(3);
    expect(merged.map((r) => r.id)).toEqual([
      "chaos-handoff-0-2026-05-18T20:30:00.000Z",
      "audit-claim",
      "audit-dispatch",
    ]);
  });
});
