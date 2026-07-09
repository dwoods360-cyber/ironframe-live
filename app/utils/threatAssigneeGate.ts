/**
 * Execution-board assignee custody — open vs human-claimed before resolution/neutralize.
 * `User_00` is acknowledge first-touch placeholder only, not forensic ownership.
 */

const OPEN_ASSIGNEE_KEYS = new Set(["", "unassigned", "user_00"]);

export const THREAT_ASSIGNMENT_REQUIRED_MSG =
  "Irongate Rejection: Claim and assign this threat before resolution.";

export function isOpenThreatAssignee(assigneeId: string | null | undefined): boolean {
  const s = (assigneeId ?? "").trim();
  if (!s) return true;
  return OPEN_ASSIGNEE_KEYS.has(s.toLowerCase());
}

export function hasHumanThreatAssignee(assigneeId: string | null | undefined): boolean {
  return !isOpenThreatAssignee(assigneeId);
}

export function assertHumanThreatAssigneeForResolution(
  assigneeId: string | null | undefined,
): void {
  if (!hasHumanThreatAssignee(assigneeId)) {
    throw new Error(THREAT_ASSIGNMENT_REQUIRED_MSG);
  }
}
