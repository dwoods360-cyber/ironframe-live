import "server-only";

import type { Prisma } from "@prisma/client";
import { ThreatState } from "@prisma/client";
import { executeAgentAction } from "@/app/actions/threatActions";
import type { AssignmentChangedLogEntry } from "@/app/actions/threatActions";
import {
  CHAOS_ASSIGNEE_IRONGATE_14,
  CHAOS_ASSIGNEE_IRONSCRIBE_5,
  CHAOS_ASSIGNEE_IRONTECH_11,
  CHAOS_ASSIGNEE_SYSTEM,
  CHAOS_DIRECTIVE,
} from "@/app/config/chaosShadowAudit";
import {
  resolveRiskRegistryForThreatEvent,
  RISK_REGISTRY_RESOLVED_AT_JSON_KEY,
} from "@/app/lib/riskRegistryDb";
import {
  assigneeKeyToDisplayName,
  buildAssigneeChangeJustificationPayload,
  CHAOS_WORKFORCE_ASSIGNEE_LABELS,
} from "@/app/utils/assignmentChainOfCustody";

export type AssigneePlane = "prod" | "shadow";

export type AppendAssigneeHistoryInput = {
  plane: AssigneePlane;
  threatId: string;
  tenantCompanyId: bigint;
  /** Persisted `assigneeId` on the row; `null` clears the lock for purge. */
  assigneeId: string | null;
  /** Human label for audit narrative (e.g. "Irongate (Agent 14) · Sensing & Sanitization"). */
  assigneeDisplay: string;
  /** Actor line in ASSIGNEE HISTORY (agent or System/Observer). */
  actorLabel: string;
  operatorId: string;
  phase?: string;
  narrative?: string;
  integrityEventType?: string;
  prodExtra?: Omit<Prisma.ThreatEventUpdateInput, "assigneeId" | "ingestionDetails">;
  shadowExtra?: Omit<Prisma.RiskEventUpdateInput, "assigneeId" | "ingestionDetails">;
  ingestionDetails?: string;
};

/** Map SYSTEM observer token to cleared row assignee while preserving display in audit JSON. */
export function resolvePersistedAssigneeId(assigneeId: string | null): string | null {
  if (assigneeId == null) return null;
  const t = assigneeId.trim();
  if (!t || t.toUpperCase() === CHAOS_ASSIGNEE_SYSTEM) return null;
  return t;
}

/**
 * Updates `current_assignee` and appends an immutable `ASSIGNEE_CHANGE` audit row (never overwrites history).
 */
export async function appendAssigneeHistory(
  input: AppendAssigneeHistoryInput,
): Promise<{ ok: true; newLog: AssignmentChangedLogEntry | null } | { ok: false; error: string }> {
  const threatId = input.threatId.trim();
  if (!threatId) return { ok: false, error: "Missing threat id." };

  const persisted = resolvePersistedAssigneeId(input.assigneeId);
  const display =
    input.assigneeDisplay.trim() ||
    (persisted == null ? "System/Observer" : assigneeKeyToDisplayName(persisted));

  /** History UI always shows the workforce label; row assignee may be cleared (SYSTEM → null). */
  const justification = buildAssigneeChangeJustificationPayload({
    newAssignee: display,
    actor: input.actorLabel.trim() || display,
    actorId: input.operatorId,
    phase: input.phase,
    assigneeId: input.assigneeId,
  });

  const narrative =
    input.narrative?.trim() ||
    (input.phase ? `[${input.phase}] ${display}` : `Assignee handoff → ${display}`);

  const shadowIngestion: Prisma.InputJsonValue | undefined =
    input.ingestionDetails != null
      ? (() => {
          try {
            return JSON.parse(input.ingestionDetails) as Prisma.InputJsonValue;
          } catch {
            return input.ingestionDetails as Prisma.InputJsonValue;
          }
        })()
      : undefined;

  const prodChanges: Prisma.ThreatEventUpdateInput | undefined =
    input.plane === "prod"
      ? {
          assigneeId: persisted,
          ...(input.ingestionDetails != null ? { ingestionDetails: input.ingestionDetails } : {}),
          ...input.prodExtra,
        }
      : undefined;

  const shadowChanges: Prisma.RiskEventUpdateInput | undefined =
    input.plane === "shadow"
      ? {
          assigneeId: persisted,
          ...(shadowIngestion != null ? { ingestionDetails: shadowIngestion } : {}),
          ...input.shadowExtra,
        }
      : undefined;

  const result = await executeAgentAction({
    plane: input.plane,
    threatId,
    tenantCompanyId: input.tenantCompanyId,
    operatorId: input.operatorId,
    justification: narrative,
    assigneeAuditJustification: justification,
    auditAction: "ASSIGNEE_CHANGE",
    integrityEventType: input.integrityEventType ?? "WORKFORCE_ASSIGNEE_HANDOFF",
    prodChanges,
    shadowChanges,
  });

  if (!result.ok) return result;

  return {
    ok: true,
    newLog: {
      id: `synthetic-${threatId}-${Date.now()}`,
      action: "ASSIGNEE_CHANGE",
      justification,
      operatorId: input.operatorId,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Convenience wrapper for autonomous agent steps (Irongate, Ironscribe, Irontech, Observer). */
export async function updateAssignee(
  input: AppendAssigneeHistoryInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await appendAssigneeHistory(input);
  if (!res.ok) return res;
  return { ok: true };
}

const WORKFORCE_AGENT_HANDOFFS: Record<
  "IRONGATE" | "IRONSCRIBE" | "IRONTECH",
  {
    assigneeId: string;
    assigneeDisplay: string;
    actorLabel: string;
    phase: string;
  }
> = {
  IRONGATE: {
    assigneeId: CHAOS_ASSIGNEE_IRONGATE_14,
    assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.IRONGATE_14,
    actorLabel: "Irongate (Agent 14)",
    phase: "T0_DMZ_IRONGATE",
  },
  IRONSCRIBE: {
    assigneeId: CHAOS_ASSIGNEE_IRONSCRIBE_5,
    assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.IRONSCRIBE_5,
    actorLabel: "Ironscribe (Agent 5)",
    phase: "T2_REGISTRATION_IRONSCRIBE",
  },
  IRONTECH: {
    assigneeId: CHAOS_ASSIGNEE_IRONTECH_11,
    assigneeDisplay: CHAOS_WORKFORCE_ASSIGNEE_LABELS.IRONTECH_11,
    actorLabel: "Irontech (Agent 11)",
    phase: "T4_REMEDIATION_IRONTECH",
  },
};

/** Phase handoff for Irongate → Ironscribe → Irontech (append-only custody). */
export async function handoffWorkforceAgent(
  agent: keyof typeof WORKFORCE_AGENT_HANDOFFS,
  base: Omit<AppendAssigneeHistoryInput, "assigneeId" | "assigneeDisplay" | "actorLabel" | "phase">,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = WORKFORCE_AGENT_HANDOFFS[agent];
  return updateAssignee({
    ...base,
    assigneeId: cfg.assigneeId,
    assigneeDisplay: cfg.assigneeDisplay,
    actorLabel: cfg.actorLabel,
    phase: cfg.phase,
    integrityEventType: `WORKFORCE_${agent}_HANDOFF`,
  });
}

export type StrikeForensicGavelInput = {
  plane: AssigneePlane;
  threatId: string;
  tenantCompanyId: bigint;
  tenantUuid: string;
  operatorId: string;
  ingestionDetails?: string;
  narrative?: string;
};

/**
 * SYSTEM_REMEDIATION_CONCURRENCE_VERIFIED — clears assignee lock, sets RESOLVED, stamps `resolvedAt`
 * on risk_registry (Supabase) and returns ISO for Zustand client stamp.
 */
export async function strikeForensicGavel(
  input: StrikeForensicGavelInput,
): Promise<{ ok: true; resolvedAt: string } | { ok: false; error: string }> {
  const resolvedAt = new Date().toISOString();
  const display = CHAOS_WORKFORCE_ASSIGNEE_LABELS.SYSTEM;

  const handoff = await appendAssigneeHistory({
    plane: input.plane,
    threatId: input.threatId,
    tenantCompanyId: input.tenantCompanyId,
    assigneeId: CHAOS_ASSIGNEE_SYSTEM,
    assigneeDisplay: display,
    actorLabel: "System/Observer",
    operatorId: input.operatorId,
    phase: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
    narrative:
      input.narrative?.trim() ||
      `[${CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION}] ${display} — forensic window closed.`,
    integrityEventType: "SYSTEM_REMEDIATION_CONCURRENCE_VERIFIED",
    ingestionDetails: input.ingestionDetails,
    prodExtra:
      input.plane === "prod"
        ? { status: ThreatState.RESOLVED }
        : undefined,
    shadowExtra:
      input.plane === "shadow"
        ? { status: ThreatState.RESOLVED }
        : undefined,
  });

  if (!handoff.ok) return handoff;

  await resolveRiskRegistryForThreatEvent({
    threatEventId: input.threatId,
    tenantId: input.tenantUuid,
    resolvedAtIso: resolvedAt,
  });

  return { ok: true, resolvedAt };
}
