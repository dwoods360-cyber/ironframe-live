import { describe, expect, it } from "vitest";
import {
  assertHumanThreatAssigneeForResolution,
  hasHumanThreatAssignee,
  isOpenThreatAssignee,
  THREAT_ASSIGNMENT_REQUIRED_MSG,
} from "@/app/utils/threatAssigneeGate";

describe("threatAssigneeGate", () => {
  it("treats null, empty, unassigned, and User_00 as open", () => {
    expect(isOpenThreatAssignee(null)).toBe(true);
    expect(isOpenThreatAssignee("")).toBe(true);
    expect(isOpenThreatAssignee("unassigned")).toBe(true);
    expect(isOpenThreatAssignee("User_00")).toBe(true);
    expect(isOpenThreatAssignee("user_00")).toBe(true);
    expect(hasHumanThreatAssignee("User_00")).toBe(false);
  });

  it("accepts roster / agent assignee keys as claimed", () => {
    expect(hasHumanThreatAssignee("dereck")).toBe(true);
    expect(hasHumanThreatAssignee("IRONTECH_04")).toBe(true);
    expect(hasHumanThreatAssignee("a1b2c3-session-uuid")).toBe(true);
  });

  it("assertHumanThreatAssigneeForResolution throws with Irongate message", () => {
    expect(() => assertHumanThreatAssigneeForResolution(null)).toThrow(
      THREAT_ASSIGNMENT_REQUIRED_MSG,
    );
    expect(() => assertHumanThreatAssigneeForResolution("user_00")).toThrow(
      THREAT_ASSIGNMENT_REQUIRED_MSG,
    );
    expect(() => assertHumanThreatAssigneeForResolution("wil-w-uuid")).not.toThrow();
  });
});
