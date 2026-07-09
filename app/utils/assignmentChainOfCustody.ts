import { displayForExpertAssigneeKey } from "@/app/config/expertAgentPersona";

/** Prisma `AuditLog.action` values for assignee chain-of-custody (legacy + hardened lock). */
export const THREAT_ASSIGNEE_AUDIT_ACTIONS = ['ASSIGNMENT_CHANGED', 'ASSIGNEE_CHANGE'] as const;

/**
 * Display labels for assignee dropdown keys (execution board) — no PII beyond existing operator ids.
 */
const ASSIGNEE_KEY_LABELS: Record<string, string> = {
  unassigned: 'Unassigned',
  dereck: 'Dereck',
  user_00: 'User_00',
  user_01: 'user_01',
  secops: 'SecOps Team',
  grc: 'GRC Team',
  netsec: 'NetSec',
  irongate_14: 'Irongate (Agent 14) · Sensing & Sanitization',
  ironscribe_5: 'Ironscribe (Agent 5) · Registration & Policy Mapping',
  irontech_04: 'Irontech (Agent 04) · Active Remediation',
  /** Legacy persisted assignee key — canonical index is Agent 04. */
  irontech_11: 'Irontech (Agent 04) · Active Remediation',
  system: 'System/Observer · Final Concurrence & Purge',
};

/** Workforce chaos drill assignee ids → display (19-agent chain of custody). */
export const CHAOS_WORKFORCE_ASSIGNEE_LABELS: Record<string, string> = {
  IRONGATE_14: ASSIGNEE_KEY_LABELS.irongate_14,
  IRONSCRIBE_5: ASSIGNEE_KEY_LABELS.ironscribe_5,
  IRONTECH_04: ASSIGNEE_KEY_LABELS.irontech_04,
  /** @deprecated legacy persisted id — display resolves to Agent 04. */
  IRONTECH_11: ASSIGNEE_KEY_LABELS.irontech_11,
  SYSTEM: ASSIGNEE_KEY_LABELS.system,
};

/** Human-readable labels for audit `operatorId` strings used in Ironframe. */
const OPERATOR_ID_LABELS: Record<string, string> = {
  'admin-user-01': 'Admin',
  dereck: 'Dereck',
  user_00: 'User_00',
  user_01: 'user_01',
  CoreIntel: 'CoreIntel',
};

export function assigneeKeyToDisplayName(key: string | null | undefined): string {
  if (key == null || String(key).trim() === '') return 'Unassigned';
  const raw = String(key).trim();
  if (raw.toLowerCase() === 'unassigned') return 'Unassigned';
  const chaos = CHAOS_WORKFORCE_ASSIGNEE_LABELS[raw.toUpperCase()];
  if (chaos) return chaos;
  const expert = displayForExpertAssigneeKey(raw);
  if (expert) return expert;
  const k = raw.toLowerCase();
  return ASSIGNEE_KEY_LABELS[k] ?? raw;
}

/** Strip UI suffixes like "(you)" from dropdown labels before persisting to audit JSON. */
export function normalizeAssigneeOptionLabel(label: string | null | undefined): string {
  const t = (label ?? '').trim();
  if (!t) return '';
  return t.replace(/\s*\(you\)\s*$/i, '').trim();
}

export function operatorIdToDisplayName(operatorId: string): string {
  const t = operatorId.trim();
  const map = OPERATOR_ID_LABELS as Record<string, string>;
  return map[t] ?? map[t.toLowerCase()] ?? t;
}

export type AssignmentJustificationPayload = {
  newAssignee?: string | null;
  actor?: string;
  actorId?: string;
  timestamp?: string;
  phase?: string;
  assigneeId?: string | null;
  /** Legacy keys from earlier ASSIGNMENT_CHANGED rows */
  newAssigneeId?: string | null;
  previousAssigneeId?: string | null;
  metadata?: {
    from?: string;
    to?: string;
    plane?: string;
  };
};

/** Standard `ASSIGNEE_CHANGE` JSON — append-only custody (matches `setThreatAssigneeAction`). */
export function buildAssigneeChangeJustificationPayload(input: {
  newAssignee: string | null;
  actor: string;
  actorId: string;
  phase?: string;
  assigneeId?: string | null;
}): string {
  const t = new Date().toISOString();
  return JSON.stringify({
    newAssignee: input.newAssignee,
    actor: input.actor,
    actorId: input.actorId,
    timestamp: t,
    phase: input.phase,
    assigneeId: input.assigneeId ?? null,
    entityType: "THREAT",
  });
}

export type AssignmentChangedLogEntry = {
  id: string;
  action: string;
  justification: string | null;
  operatorId: string;
  createdAt: string;
};

function assigneeHistoryPhaseKey(entry: AssignmentChangedLogEntry): string {
  const parsed = parseAssignmentJustification(entry.justification);
  const phase = parsed?.phase?.trim();
  if (phase) return phase;
  /** Human claim/reassign rows have no phase — dedupe by stable audit id, not operator+second. */
  return entry.id?.trim() || `row-${entry.createdAt}`;
}

/** Merge audit trail + persisted chaos handoffs; oldest → newest (no duplicate phases). */
export function mergeAssignmentHistoryEntries(
  auditRows: AssignmentChangedLogEntry[] | undefined,
  ingestionDetails: string | null | undefined,
): AssignmentChangedLogEntry[] {
  const fromAudit = (auditRows ?? []).filter(
    (r) => r.action === "ASSIGNEE_CHANGE" || r.action === "ASSIGNMENT_CHANGED",
  );
  const fromChaosJson = chaosHandoffToAssignmentEntries(ingestionDetails);
  const seen = new Set<string>();
  const merged: AssignmentChangedLogEntry[] = [];
  for (const row of [...fromAudit, ...fromChaosJson]) {
    const key = assigneeHistoryPhaseKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return merged;
}

/** `ingestionDetails.chaosAssigneeHandoffHistory` → assignee history rows for ThreatCard UI. */
export function chaosHandoffToAssignmentEntries(
  ingestionDetails: string | null | undefined,
): AssignmentChangedLogEntry[] {
  const raw = ingestionDetails?.trim();
  if (!raw) return [];
  try {
    const o = JSON.parse(raw) as { chaosAssigneeHandoffHistory?: unknown; isChaosTest?: unknown };
    if (o.isChaosTest !== true || !Array.isArray(o.chaosAssigneeHandoffHistory)) return [];
    return (o.chaosAssigneeHandoffHistory as Array<Record<string, unknown>>)
      .map((h, idx) => {
        const at = typeof h.at === "string" ? h.at : new Date().toISOString();
        const assigneeId = typeof h.assigneeId === "string" ? h.assigneeId : "";
        const assigneeLabel =
          typeof h.assigneeLabel === "string" && h.assigneeLabel.trim()
            ? h.assigneeLabel.trim()
            : assigneeKeyToDisplayName(assigneeId);
        const phase = typeof h.phase === "string" ? h.phase : "";
        const directiveId = typeof h.directiveId === "string" ? h.directiveId : "";
        const actor =
          assigneeLabel ||
          (assigneeId.toUpperCase() === "SYSTEM"
            ? "System/Observer"
            : assigneeKeyToDisplayName(assigneeId));
        return {
          id: `chaos-handoff-${idx}-${at}`,
          action: "ASSIGNEE_CHANGE",
          justification: buildAssigneeChangeJustificationPayload({
            newAssignee:
              assigneeId.toUpperCase() === "SYSTEM" ? "System/Observer · Final Concurrence & Purge" : assigneeLabel,
            actor,
            actorId: assigneeId || "SYSTEM",
            phase,
            assigneeId: assigneeId || null,
          }),
          operatorId: assigneeId || "SYSTEM",
          createdAt: at,
        };
      })
      .filter((row) => row.justification.length > 2);
  } catch {
    return [];
  }
}

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

  const narrator = parsed.actor?.trim() || operatorIdToDisplayName(entry.operatorId);
  const phaseSuffix =
    typeof parsed.phase === 'string' && parsed.phase.trim()
      ? ` · ${parsed.phase.trim()}`
      : '';
  const fromLabel = parsed.metadata?.from?.trim();
  const toLabel = parsed.metadata?.to?.trim();

  if (fromLabel && toLabel) {
    if (toLabel.toLowerCase() === 'unassigned') {
      return `${narrator} moved assignee from ${fromLabel} to Unassigned at ${when}${phaseSuffix}`;
    }
    if (fromLabel.toLowerCase() === 'unassigned') {
      return `${narrator} claimed from Unassigned → ${toLabel} at ${when}${phaseSuffix}`;
    }
    return `${narrator} moved assignee from ${fromLabel} to ${toLabel} at ${when}${phaseSuffix}`;
  }

  if ('newAssignee' in parsed) {
    const a = parsed.newAssignee;
    if (a == null || String(a).trim() === '' || String(a).trim().toLowerCase() === 'unassigned') {
      return `${narrator} cleared the assignment at ${when}${phaseSuffix}`;
    }
    const assigneeLabel = String(a).trim();
    const narratorShort = narrator.split("·")[0]?.trim() || narrator;
    const assigneeShort = assigneeLabel.split("·")[0]?.trim() || assigneeLabel;
    if (
      narratorShort.toLowerCase() === assigneeShort.toLowerCase() ||
      assigneeLabel.toLowerCase().startsWith(narratorShort.toLowerCase())
    ) {
      return `${assigneeLabel} at ${when}${phaseSuffix}`;
    }
    return `${narrator} → ${assigneeLabel} at ${when}${phaseSuffix}`;
  }

  if ('newAssigneeId' in parsed) {
    const id = parsed.newAssigneeId;
    if (id == null) {
      return `${narrator} cleared the assignment at ${when}${phaseSuffix}`;
    }
    const assigneeName = assigneeKeyToDisplayName(id);
    if (assigneeName === 'Unassigned') {
      return `${narrator} cleared the assignment at ${when}${phaseSuffix}`;
    }
    return `${narrator} assigned this to ${assigneeName} at ${when}${phaseSuffix}`;
  }

  return `${operatorIdToDisplayName(entry.operatorId)} · ${when}`;
}
