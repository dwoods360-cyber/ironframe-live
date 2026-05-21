import "server-only";

import { logStructuredEvent } from "@/lib/structuredServerLog";

/** Canonical system signals mapped to SOC2 / ISO 27001 Annex A (Irontally Agent 19). */
export type FrameworkCanonicalEvent =
  | "TENANT_SCOPE_CHANGE"
  | "IRONGUARD_BREACH_BLOCKED"
  | "STATE_FREEZE_TRIGGERED"
  | "QUARANTINE_HARD_BAN";

export type FrameworkControlRow = {
  canonicalEvent: FrameworkCanonicalEvent;
  /** Human-readable label for the audit table. */
  eventLabel: string;
  soc2Ref: string | null;
  soc2Clause: string | null;
  isoRef: string | null;
  isoClause: string | null;
  /** PASS when control exercised successfully in-window; N/A when no signal. */
  status: "PASS" | "N/A";
  /** AuditLog id, IronguardViolation id, QuarantineLedger id, or SystemConfig witness timestamp. */
  forensicEvidence: string;
};

/**
 * Control mapping matrix — links Ironframe system events to SOC2 CC-series and ISO 27001 Annex A.
 */
export const FRAMEWORK_CONTROL_MATRIX: Record<
  FrameworkCanonicalEvent,
  {
    eventLabel: string;
    soc2Ref: string | null;
    soc2Clause: string | null;
    isoRef: string | null;
    isoClause: string | null;
  }
> = {
  TENANT_SCOPE_CHANGE: {
    eventLabel: "Tenant scope change (authorized operator)",
    soc2Ref: "CC6.3",
    soc2Clause: "Authorization",
    isoRef: null,
    isoClause: null,
  },
  IRONGUARD_BREACH_BLOCKED: {
    eventLabel: "Ironguard boundary denial (cross-tenant / session isolation)",
    soc2Ref: null,
    soc2Clause: null,
    isoRef: "A.13.1",
    isoClause: "Network security",
  },
  STATE_FREEZE_TRIGGERED: {
    eventLabel: "Autonomous global state freeze (Ironlock)",
    soc2Ref: "CC7.5",
    soc2Clause: "Incident recovery",
    isoRef: null,
    isoClause: null,
  },
  QUARANTINE_HARD_BAN: {
    eventLabel: "Quarantine ledger hard ban (recidivist)",
    soc2Ref: null,
    soc2Clause: null,
    isoRef: "A.12.2",
    isoClause: "Protection from malware",
  },
};

/** Ironguard `error_code` values treated as boundary “breach blocked” for A.13.1 mapping. */
export const IRONGUARD_BREACH_BLOCKED_ERROR_CODES = new Set([
  "CROSS_TENANT_API_BLOCKED",
  "IRONGUARD_SESSION_HEADER_MISMATCH",
  "IRONGUARD_NO_TENANT_HEADER",
  "IRONGUARD_INVALID_TENANT_ID",
]);

export function isIronguardBreachBlockedCode(errorCode: string | null | undefined): boolean {
  const c = (errorCode ?? "").trim().toUpperCase();
  if (!c) return false;
  if (IRONGUARD_BREACH_BLOCKED_ERROR_CODES.has(c)) return true;
  if (c.startsWith("IRONGUARD_")) return true;
  return false;
}

export type FrameworkComplianceMappingInput = {
  windowStartIso: string;
  windowEndIso: string;
  tenantScopeChangeCount: number;
  /** Representative AuditLog row id (composite key uses tenantId+id in DB; we surface `id` only in report). */
  tenantScopeChangeEvidenceAuditLogId: string | null;
  ironguardBreachBlockedCount: number;
  /** Representative IronguardViolation id + optional count suffix in prose. */
  ironguardBreachBlockedEvidenceViolationId: string | null;
  stateFreezeTriggeredCount: number;
  stateFreezeEvidenceAuditLogId: string | null;
  /** `SystemConfig.updatedAt` when freeze row touched in-window (fallback if no AuditLog id). */
  stateFreezeEvidenceSystemConfigIso: string | null;
  quarantineHardBanCount: number;
  quarantineHardBanEvidenceLedgerId: string | null;
  /** Error codes or audit actions with no matrix row — triggers blind-spot Ironcast. */
  complianceBlindSpots: string[];
};

function frameworkMappingCell(meta: (typeof FRAMEWORK_CONTROL_MATRIX)[FrameworkCanonicalEvent]): string {
  const parts: string[] = [];
  if (meta.soc2Ref) parts.push(`SOC2 **${meta.soc2Ref}** (${meta.soc2Clause ?? ""})`);
  if (meta.isoRef) parts.push(`ISO 27001 **Annex ${meta.isoRef}** (${meta.isoClause ?? ""})`);
  return parts.join(" · ") || "—";
}

function buildRows(input: FrameworkComplianceMappingInput): FrameworkControlRow[] {
  const m = FRAMEWORK_CONTROL_MATRIX;
  return [
    {
      canonicalEvent: "TENANT_SCOPE_CHANGE",
      eventLabel: m.TENANT_SCOPE_CHANGE.eventLabel,
      soc2Ref: m.TENANT_SCOPE_CHANGE.soc2Ref,
      soc2Clause: m.TENANT_SCOPE_CHANGE.soc2Clause,
      isoRef: m.TENANT_SCOPE_CHANGE.isoRef,
      isoClause: m.TENANT_SCOPE_CHANGE.isoClause,
      status: input.tenantScopeChangeCount > 0 ? "PASS" : "N/A",
      forensicEvidence:
        input.tenantScopeChangeCount > 0 && input.tenantScopeChangeEvidenceAuditLogId
          ? `AuditLog partition witness \`tenant_id\`+\`id\`=\`${input.tenantScopeChangeEvidenceAuditLogId}\` (window ${input.windowStartIso} → ${input.windowEndIso})`
          : input.tenantScopeChangeCount > 0
            ? `AuditLog \`TENANT_SCOPE_CHANGE\` rows (${input.tenantScopeChangeCount}); window ${input.windowStartIso} → ${input.windowEndIso}`
            : "— (no `TENANT_SCOPE_CHANGE` rows in window)",
    },
    {
      canonicalEvent: "IRONGUARD_BREACH_BLOCKED",
      eventLabel: m.IRONGUARD_BREACH_BLOCKED.eventLabel,
      soc2Ref: m.IRONGUARD_BREACH_BLOCKED.soc2Ref,
      soc2Clause: m.IRONGUARD_BREACH_BLOCKED.soc2Clause,
      isoRef: m.IRONGUARD_BREACH_BLOCKED.isoRef,
      isoClause: m.IRONGUARD_BREACH_BLOCKED.isoClause,
      status: input.ironguardBreachBlockedCount > 0 ? "PASS" : "N/A",
      forensicEvidence:
        input.ironguardBreachBlockedCount > 0 && input.ironguardBreachBlockedEvidenceViolationId
          ? `IronguardViolation.id=\`${input.ironguardBreachBlockedEvidenceViolationId}\` (+${Math.max(0, input.ironguardBreachBlockedCount - 1)} additional row(s) in window)`
          : input.ironguardBreachBlockedCount > 0
            ? `IronguardViolation table; ${input.ironguardBreachBlockedCount} row(s); window ${input.windowStartIso} → ${input.windowEndIso}`
            : "— (no Ironguard boundary denials in window)",
    },
    {
      canonicalEvent: "STATE_FREEZE_TRIGGERED",
      eventLabel: m.STATE_FREEZE_TRIGGERED.eventLabel,
      soc2Ref: m.STATE_FREEZE_TRIGGERED.soc2Ref,
      soc2Clause: m.STATE_FREEZE_TRIGGERED.soc2Clause,
      isoRef: m.STATE_FREEZE_TRIGGERED.isoRef,
      isoClause: m.STATE_FREEZE_TRIGGERED.isoClause,
      status: input.stateFreezeTriggeredCount > 0 ? "PASS" : "N/A",
      forensicEvidence:
        input.stateFreezeTriggeredCount > 0 && input.stateFreezeEvidenceAuditLogId
          ? `AuditLog.id=\`${input.stateFreezeEvidenceAuditLogId}\` (action \`AUTONOMOUS_STATE_FREEZE_TRIGGERED\`)`
          : input.stateFreezeTriggeredCount > 0 && input.stateFreezeEvidenceSystemConfigIso
            ? `SystemConfig witness \`updated_at=${input.stateFreezeEvidenceSystemConfigIso}\` (global freeze row)`
            : input.stateFreezeTriggeredCount > 0
              ? "AuditLog / SystemConfig freeze witness (id resolution pending)"
              : "— (no freeze arm events in window)",
    },
    {
      canonicalEvent: "QUARANTINE_HARD_BAN",
      eventLabel: m.QUARANTINE_HARD_BAN.eventLabel,
      soc2Ref: m.QUARANTINE_HARD_BAN.soc2Ref,
      soc2Clause: m.QUARANTINE_HARD_BAN.soc2Clause,
      isoRef: m.QUARANTINE_HARD_BAN.isoRef,
      isoClause: m.QUARANTINE_HARD_BAN.isoClause,
      status: input.quarantineHardBanCount > 0 ? "PASS" : "N/A",
      forensicEvidence:
        input.quarantineHardBanCount > 0 && input.quarantineHardBanEvidenceLedgerId
          ? `QuarantineLedger.id=\`${input.quarantineHardBanEvidenceLedgerId}\` (+${Math.max(0, input.quarantineHardBanCount - 1)} additional hard-ban row(s))`
          : input.quarantineHardBanCount > 0
            ? `QuarantineLedger; ${input.quarantineHardBanCount} hard-ban row(s)`
            : "— (no hard-ban ledger rows in window)",
    },
  ];
}

export function buildFrameworkComplianceMappingMarkdown(input: FrameworkComplianceMappingInput): string {
  const rows = buildRows(input);
  const header =
    "| System event (canonical) | Framework mapping (SOC2 / ISO 27001 Annex A) | Compliance status | Forensic evidence |\n" +
    "|---|---|---|---|\n";
  const body = rows
    .map((r) => {
      const mapCell = frameworkMappingCell(FRAMEWORK_CONTROL_MATRIX[r.canonicalEvent]);
      return `| \`${r.canonicalEvent}\` | ${mapCell} | **${r.status}** | ${r.forensicEvidence.replace(/\|/g, "\\|")} |`;
    })
    .join("\n");

  const blindSpotBlock =
    input.complianceBlindSpots.length > 0
      ? `\n**Compliance blind spots (unmapped signals):** ${input.complianceBlindSpots.map((s) => `\`${s}\``).join(", ")}\n`
      : "\n_Compliance blind spots: none detected in Irontally classifier for this window._\n";

  const gavel =
    "\n**Irontally (Agent 19) — Gavel:** This report serves as primary evidence for Continuous Compliance under the Ironframe Constitution.\n";

  return (
    `## Framework compliance mapping (Irontally — pre-audit appendage)\n\n` +
    `_Window: ${input.windowStartIso} → ${input.windowEndIso}_\n\n` +
    header +
    body +
    blindSpotBlock +
    gavel
  );
}

export async function sendComplianceBlindSpotIroncast(blindSpots: string[], context: Record<string, unknown>): Promise<void> {
  if (blindSpots.length === 0) return;
  const url = process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_URL?.trim();
  if (!url) return;
  const secret = process.env.IRONFRAME_DEV_DIAGNOSTIC_WEBHOOK_SECRET?.trim();
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-ironframe-webhook-secret": secret } : {}),
      },
      body: JSON.stringify({
        kind: "IRONTALLY_COMPLIANCE_BLIND_SPOT",
        agent: "Irontally",
        blindSpots,
        ...context,
      }),
    });
  } catch (e) {
    logStructuredEvent(
      "Ironcast",
      "irontally_compliance_blind_spot_webhook_error",
      { message: e instanceof Error ? e.message : String(e) },
      "error",
    );
  }
}
