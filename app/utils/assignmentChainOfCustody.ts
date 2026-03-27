/**
 * Display labels for assignee dropdown keys (execution board) — no PII beyond existing operator ids.
 */
const ASSIGNEE_KEY_LABELS: Record<string, string> = {
  unassigned: 'Unassigned',
  dereck: 'Dereck',
  user_00: 'user_00',
  user_01: 'user_01',
  secops: 'SecOps Team',
  grc: 'GRC Team',
  netsec: 'NetSec',
};

/** Human-readable labels for audit `operatorId` strings used in Ironframe. */
const OPERATOR_ID_LABELS: Record<string, string> = {
  'admin-user-01': 'Admin',
  dereck: 'Dereck',
  user_00: 'user_00',
  user_01: 'user_01',
  CoreIntel: 'CoreIntel',
};

export function assigneeKeyToDisplayName(key: string | null | undefined): string {
  if (key == null || String(key).trim() === '') return 'Unassigned';
  const k = String(key).trim().toLowerCase();
  return ASSIGNEE_KEY_LABELS[k] ?? String(key).trim();
}

export function operatorIdToDisplayName(operatorId: string): string {
  return OPERATOR_ID_LABELS[operatorId] ?? operatorId;
}

export type AssignmentJustificationPayload = {
  newAssignee?: string | null;
  actor?: string;
  actorId?: string;
  timestamp?: string;
  /** Legacy keys from earlier ASSIGNMENT_CHANGED rows */
  newAssigneeId?: string | null;
  previousAssigneeId?: string | null;
};

export function parseAssignmentJustification(raw: string | null | undefined): AssignmentJustificationPayload | null {
  const t = raw?.trim();
  if (!t?.startsWith('{')) return null;
  try {
    return JSON.parse(t) as AssignmentJustificationPayload;
  } catch {
    return null;
  }
}

/**
 * Narrative line for ASSIGNEE HISTORY UI.
 * New rows: `{ newAssignee, actor, actorId?, timestamp }` — `newAssignee` null means cleared.
 * Legacy: `{ newAssigneeId, previousAssigneeId, timestamp }` — actor from `operatorId` only.
 */
export function formatAssignmentHistoryNarrative(entry: {
  justification: string | null;
  operatorId: string;
  createdAt: string;
}): string {
  const when = new Date(entry.createdAt).toLocaleString();
  const parsed = parseAssignmentJustification(entry.justification);
  if (!parsed) {
    return `${operatorIdToDisplayName(entry.operatorId)} · ${when}`;
  }

  if ('newAssignee' in parsed) {
    const narrator = parsed.actor?.trim() || operatorIdToDisplayName(entry.operatorId);
    const a = parsed.newAssignee;
    if (a == null || String(a).trim() === '' || String(a).trim().toLowerCase() === 'unassigned') {
      return `${narrator} cleared the assignment at ${when}`;
    }
    return `${narrator} assigned this to ${String(a).trim()} at ${when}`;
  }

  if ('newAssigneeId' in parsed) {
    const narrator = operatorIdToDisplayName(entry.operatorId);
    const id = parsed.newAssigneeId;
    if (id == null) {
      return `${narrator} cleared the assignment at ${when}`;
    }
    const assigneeName = assigneeKeyToDisplayName(id);
    if (assigneeName === 'Unassigned') {
      return `${narrator} cleared the assignment at ${when}`;
    }
    return `${narrator} assigned this to ${assigneeName} at ${when}`;
  }

  return `${operatorIdToDisplayName(entry.operatorId)} · ${when}`;
}
