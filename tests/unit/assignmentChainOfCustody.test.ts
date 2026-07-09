import { describe, expect, it } from "vitest";
import {
  formatAssignmentHistoryNarrative,
  normalizeAssigneeOptionLabel,
} from "@/app/utils/assignmentChainOfCustody";

describe("assignmentChainOfCustody", () => {
  it("formats claim from Unassigned using metadata.from/to", () => {
    const line = formatAssignmentHistoryNarrative({
      createdAt: "2026-07-08T12:00:00.000Z",
      operatorId: "wil-user-id",
      justification: JSON.stringify({
        actor: "Wil W",
        newAssignee: "Wil W",
        metadata: { from: "Unassigned", to: "Wil W" },
      }),
    });
    expect(line).toContain("claimed from Unassigned → Wil W");
  });

  it("formats return to Unassigned using metadata.from/to", () => {
    const line = formatAssignmentHistoryNarrative({
      createdAt: "2026-07-08T12:00:00.000Z",
      operatorId: "wil-user-id",
      justification: JSON.stringify({
        actor: "Wil W",
        newAssignee: null,
        metadata: { from: "Wil W", to: "Unassigned" },
      }),
    });
    expect(line).toContain("moved assignee from Wil W to Unassigned");
  });

  it("strips (you) suffix from dropdown labels", () => {
    expect(normalizeAssigneeOptionLabel("Wil W (you)")).toBe("Wil W");
    expect(normalizeAssigneeOptionLabel("Unassigned")).toBe("Unassigned");
  });
});
