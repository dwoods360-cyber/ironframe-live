/**
 * Execution-board assignee custody — open vs human-claimed before resolution/neutralize.
 * `User_00` is acknowledge first-touch placeholder only, not forensic ownership.
 * Team routing buckets (SecOps / GRC / NetSec) are triage labels, not human operators.
 */

import { TEAM_ROUTING_ASSIGNEE_VALUES } from "@/app/utils/assigneeSelectValue";

const OPEN_ASSIGNEE_KEYS = new Set(["", "unassigned", "user_00"]);

export const THREAT_ASSIGNMENT_REQUIRED_MSG =
  "Irongate Rejection: Claim and assign this threat to a tenant operator before resolution.";

export function isTeamRoutingAssignee(assigneeId: string | null | undefined): boolean {
  const s = (assigneeId ?? "").trim().toLowerCase();
  return s.length > 0 && TEAM_ROUTING_ASSIGNEE_VALUES.has(s);
}

export function isOpenThreatAssignee(assigneeId: string | null | undefined): boolean {
  const s = (assigneeId ?? "").trim();
  if (!s) return true;
  if (TEAM_ROUTING_ASSIGNEE_VALUES.has(s.toLowerCase())) return true;
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
