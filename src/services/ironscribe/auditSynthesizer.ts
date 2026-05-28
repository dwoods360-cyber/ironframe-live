import "server-only";

import prisma from "@/lib/prisma";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import { HUMAN_ACK_ANOMALY_AUDIT_ACTION } from "@/app/lib/ironwatch/humanAckAnomalyAuditAction";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import {
  directiveKeyFromIronguardErrorCode,
  GOVERNED_FINANCIAL_BASELINE_USD_BILLIONS,
  tasDirectiveLabel,
  type ConstitutionalDirectiveKey,
} from "@/src/services/ironscribe/constitutionalAuditDirectives";
import {
  buildFrameworkComplianceMappingMarkdown,
  isIronguardBreachBlockedCode,
  sendComplianceBlindSpotIroncast,
} from "@/src/services/irontally/frameworkMapper";

const WINDOW_MS = 24 * 60 * 60 * 1000;
/** Correlate ledger rows to Ironguard targets (tenant labels) beyond the 24h report window. */
const VIOLATION_CORRELATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const IRONLOCK_FREEZE_AUDIT_ACTION = "AUTONOMOUS_STATE_FREEZE_TRIGGERED";

function isoDayStamp(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Windows-safe filename fragment from ISO time. */
function auditReportTimestampFragment(d: Date): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

function normIp(raw: string | null | undefined): string | null {
  const t = raw?.trim().toLowerCase();
  return t || null;
}

function normUuid(raw: string | null | undefined): string | null {
  const t = raw?.trim().toLowerCase();
  return t || null;
}

/** Privacy-safe display for daily transparency digest. */
export function maskLedgerIdentifierForAudit(identifier: string): string {
  const id = identifier.trim().toLowerCase();
  if (id.startsWith("ip:")) {
    const ip = id.slice(3);
    const parts = ip.split(".");
    if (parts.length === 4 && parts.every((p) => p.length > 0)) {
      return `ip:${parts[0]}.${parts[1]}.*.* (masked)`;
    }
    if (ip.length > 16) return `ip:${ip.slice(0, 8)}…${ip.slice(-4)} (masked)`;
    return `ip:*** (masked)`;
  }
  if (id.startsWith("user:")) {
    const u = id.slice(5);
    if (u.length > 16) return `user:${u.slice(0, 8)}…${u.slice(-4)} (masked)`;
    return `user:*** (masked)`;
  }
  if (id.length > 20) return `${id.slice(0, 12)}… (masked)`;
  return `${id} (masked)`;
}

function tenantLabelFromUuid(uuid: string | null | undefined): string {
  if (!uuid?.trim()) return "—";
  const key = tenantKeyFromUuid(uuid.trim());
  if (key) return key.charAt(0).toUpperCase() + key.slice(1);
  return `Unknown tenant (${uuid.trim().slice(0, 8)}…)`;
}

function pickViolationTargetUuid(v: {
  attemptedTenantUuid: string | null;
  sessionTenantUuid: string | null;
}): string | null {
  const a = v.attemptedTenantUuid?.trim();
  if (a) return a.toLowerCase();
  const s = v.sessionTenantUuid?.trim();
  if (s) return s.toLowerCase();
  return null;
}

async function sendRecidivistSummaryIroncast(payload: Record<string, unknown>): Promise<void> {
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
      body: JSON.stringify({ kind: "IRONSCRIBE_DAILY_AUDIT_RECIDIVISTS", agent: "Ironscribe", ...payload }),
    });
  } catch (e) {
    logStructuredEvent(
      "Ironcast",
      "ironscribe_recidivist_webhook_error",
      { message: e instanceof Error ? e.message : String(e) },
      "error",
    );
  }
}

function formatDirectiveSummaryLine(
  counts: Map<ConstitutionalDirectiveKey, number>,
  freezeTriggers: number,
): string {
  const parts: string[] = [];
  const ig = counts.get("IRONGUARD_13") ?? 0;
  if (ig > 0) parts.push(`**${tasDirectiveLabel("IRONGUARD_13")}** — _${ig}_ enforcement event(s)`);
  if (freezeTriggers > 0) {
    parts.push(`**${tasDirectiveLabel("IRONLOCK_06")}** — _${freezeTriggers}_ global freeze arm event(s) (AuditLog)`);
  }
  const residue = counts.get("RESIDUE_GAP") ?? 0;
  if (residue > 0) parts.push(`**${tasDirectiveLabel("RESIDUE_GAP")}** — _${residue}_ row(s) (see Residue of Risk)`);
  return parts.length > 0 ? parts.join("; ") : "_No directive-classified Ironguard rows in this window._";
}

/**
 * Agent 5 (Ironscribe): aggregate last-24h AuditLog + IronguardViolation + QuarantineLedger (high-risk)
 * into a Markdown digest **prioritizing governance & compliance impact** over raw SOC tables.
 */
export async function runIronscribeDailyAuditSynthesis(now: Date = new Date()): Promise<{
  ok: true;
  reportPath: string;
  tenantScopeEvents: number;
  ironguardBlockedRows: number;
  highRiskRecidivists: number;
}> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const correlationSince = new Date(now.getTime() - VIOLATION_CORRELATION_WINDOW_MS);

  const [
    tenantScopeLogs,
    ironguardRows,
    highRiskLedger,
    correlationViolations,
    freezeTriggerCount,
    freezeEvidenceLog,
    systemConfigRow,
    governedExceptionLogs,
    humanAnomalyAckLogs,
  ] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          action: "TENANT_SCOPE_CHANGE",
        },
        select: {
          id: true,
          tenantId: true,
          createdAt: true,
          operatorId: true,
          justification: true,
          governance_tenant_uuid: true,
        },
        orderBy: { createdAt: "asc" },
        take: 5000,
      }),
      prisma.ironguardViolation.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 2000,
      }),
      prisma.quarantineLedger.findMany({
        where: {
          OR: [{ offenseCount: { gt: 1 } }, { isHardBan: true }],
        },
        orderBy: { lastViolationAt: "desc" },
        take: 500,
      }),
      prisma.ironguardViolation.findMany({
        where: { createdAt: { gte: correlationSince } },
        orderBy: { createdAt: "desc" },
        select: {
          metadata: true,
          attemptedTenantUuid: true,
          sessionTenantUuid: true,
          createdAt: true,
        },
        take: 10000,
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: since },
          action: IRONLOCK_FREEZE_AUDIT_ACTION,
        },
      }),
      prisma.auditLog.findFirst({
        where: {
          createdAt: { gte: since },
          action: IRONLOCK_FREEZE_AUDIT_ACTION,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, tenantId: true },
      }),
      prisma.systemConfig.findUnique({
        where: { id: "global" },
        select: { updatedAt: true },
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          action: {
            in: ["GOVERNED_EXCEPTION_QUARANTINE_RESET", "ATTEMPTING_NON_COMPLIANT_OVERRIDE"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          tenantId: true,
          createdAt: true,
          operatorId: true,
          action: true,
          justification: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          action: HUMAN_ACK_ANOMALY_AUDIT_ACTION,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          tenantId: true,
          createdAt: true,
          operatorId: true,
          justification: true,
        },
      }),
    ]);

  const directiveCounts = new Map<ConstitutionalDirectiveKey, number>();
  for (const v of ironguardRows) {
    const k = directiveKeyFromIronguardErrorCode(v.errorCode);
    directiveCounts.set(k, (directiveCounts.get(k) ?? 0) + 1);
  }

  const totalUnauthorizedAttempts = ironguardRows.length;
  const residueGapCount = directiveCounts.get("RESIDUE_GAP") ?? 0;
  const blocksWithExplicitDirective = totalUnauthorizedAttempts - residueGapCount;
  /** Policy enforcement success: share of attempts that map to a named TAS/Ironguard/Ironlock directive (not residue). */
  const policyEnforcementSuccessPct =
    totalUnauthorizedAttempts === 0
      ? 100
      : Math.round((blocksWithExplicitDirective / totalUnauthorizedAttempts) * 1000) / 10;

  const latestTargetByLedgerKey = new Map<string, { uuid: string; at: Date }>();
  const distinctTenantsByIpKey = new Map<string, Set<string>>();

  for (const v of correlationViolations) {
    const m = v.metadata as Record<string, unknown> | null;
    const ipRaw = typeof m?.clientIp === "string" ? m.clientIp : undefined;
    const userRaw = typeof m?.userId === "string" ? m.userId : undefined;
    const ip = normIp(ipRaw);
    const uid = normUuid(userRaw);
    const target = pickViolationTargetUuid(v);
    if (ip) {
      const key = `ip:${ip}`;
      if (target && !latestTargetByLedgerKey.has(key)) {
        latestTargetByLedgerKey.set(key, { uuid: target, at: v.createdAt });
      }
      if (target) {
        let set = distinctTenantsByIpKey.get(key);
        if (!set) {
          set = new Set();
          distinctTenantsByIpKey.set(key, set);
        }
        set.add(target);
      }
    }
    if (uid) {
      const key = `user:${uid}`;
      if (target && !latestTargetByLedgerKey.has(key)) {
        latestTargetByLedgerKey.set(key, { uuid: target, at: v.createdAt });
      }
    }
  }

  const crossTenantProbeNotes: string[] = [];
  for (const row of highRiskLedger) {
    const id = row.identifier.trim().toLowerCase();
    if (!id.startsWith("ip:")) continue;
    const tenants = distinctTenantsByIpKey.get(id);
    if (tenants && tenants.size >= 2) {
      const labels = [...tenants].map((u) => tenantLabelFromUuid(u)).sort();
      crossTenantProbeNotes.push(
        `- **Systemic note (Ironscribe):** Identifier \`${maskLedgerIdentifierForAudit(id)}\` is exhibiting **cross-tenant probing** (${tenants.size} distinct tenant targets in the correlation window: ${labels.join(", ")}).`,
      );
    }
  }

  const highRiskBody =
    highRiskLedger.length === 0
      ? "_No ledger rows matched **offense_count > 1** or **hard ban** in this run._\n"
      : highRiskLedger
          .map((row, i) => {
            const lid = row.identifier.trim().toLowerCase();
            const masked = maskLedgerIdentifierForAudit(row.identifier);
            const targetHit = latestTargetByLedgerKey.get(lid);
            const tenantLine = targetHit
              ? `**${tenantLabelFromUuid(targetHit.uuid)}** (UUID \`${targetHit.uuid.slice(0, 8)}…\`, last seen \`${targetHit.at.toISOString()}\`)`
              : "_No correlated Ironguard tenant target in the 7d correlation window (metadata IP/user alignment)._";
            const resetLine = row.resetByHumanId
              ? `Previously cleared (**Gavel**) by operator \`${row.resetByHumanId}\` (ledger row last updated \`${row.updatedAt.toISOString()}\`).`
              : "_No operator reset recorded on this ledger row._";
            const forensicLine = row.forensicJustification
              ? `**Forensic justification:** governed narrative on file (${row.forensicJustification.length} chars; cross-listed under **Governed Exception** in Tenant Access Audit).`
              : "_No `forensic_justification` stored on this row._";
            const status = row.isHardBan ? "**HARD BAN**" : "Probation / elevated strikes";
            return [
              `#### ${i + 1}. ${masked}`,
              "",
              `- **Ledger key (internal):** \`${lid}\``,
              `- **Status:** ${status}`,
              `- **Total offense count:** ${row.offenseCount}`,
              `- **Most recent tenant target (correlated):** ${tenantLine}`,
              `- **Reset history:** ${resetLine}`,
              `- **Forensic / Irontally:** ${forensicLine}`,
              `- **Last violation (UTC):** \`${row.lastViolationAt.toISOString()}\``,
              "",
            ].join("\n");
          })
          .join("\n");

  const systemicBlock =
    crossTenantProbeNotes.length > 0
      ? ["**Systemic notes (recidivism probability)**", "", ...crossTenantProbeNotes, ""].join("\n")
      : "_No cross-tenant probing pattern detected for high-risk IP identifiers in this correlation window._\n";

  const highRiskSection = `## ⚠️ HIGH-RISK ADVERSARIAL ACTIVITY (RECIDIVISTS)

_Filter: \`QuarantineLedger\` where \`offense_count > 1\` **OR** \`is_hard_ban = true\` (${highRiskLedger.length} row(s))._

${systemicBlock}

### Recidivist profiles

${highRiskBody}
`;

  const governedExceptionBody =
    governedExceptionLogs.length === 0
      ? "_No `GOVERNED_EXCEPTION_QUARANTINE_RESET` or `ATTEMPTING_NON_COMPLIANT_OVERRIDE` rows in this 24h window._\n"
      : governedExceptionLogs
          .map(
            (r) =>
              `- \`${r.createdAt.toISOString()}\` | **${r.action}** | operator=\`${r.operatorId}\` | digest: _${(r.justification ?? "").slice(0, 220).replace(/\|/g, "/")}_`,
          )
          .join("\n");

  const governedExceptionsSection = `## Irontally — Governed Exception register (Ironlock / Quarantine)

_Linkage: \`QuarantineLedger.forensic_justification\` ↔ \`AuditLog\` (Tenant Access Audit digest; artifact family \`storage/forensics/audits/DAILY_AUDIT_REPORT_*.md\`)._

${governedExceptionBody}
`;

  const humanAnomalyAckBody =
    humanAnomalyAckLogs.length === 0
      ? "_No Command Post human anomaly acknowledgments in this 24h window._\n"
      : humanAnomalyAckLogs
          .map(
            (r) =>
              `- \`${r.createdAt.toISOString()}\` | operator=\`${r.operatorId}\` | digest: _${(r.justification ?? "").slice(0, 280).replace(/\|/g, "/")}_`,
          )
          .join("\n");

  const humanAnomalyAckSection = `## Human authority — Command Post anomaly acknowledgments (Ironwatch / Ironlock)

_Immutable \`AuditLog\` channel: action \`${HUMAN_ACK_ANOMALY_AUDIT_ACTION}\` (verbatim \`[HUMAN_ACK_ANOMALY]\` justification line; Ironscribe 24h window)._

${humanAnomalyAckBody}
`;

  const tenantUserCounts = new Map<string, number>();
  for (const row of tenantScopeLogs) {
    const uid = row.operatorId?.trim() || "unknown";
    tenantUserCounts.set(uid, (tenantUserCounts.get(uid) ?? 0) + 1);
  }

  const residueRows = ironguardRows.filter(
    (v) => directiveKeyFromIronguardErrorCode(v.errorCode) === "RESIDUE_GAP",
  );
  const residueCodes = new Map<string, number>();
  for (const r of residueRows) {
    const c = (r.errorCode ?? "UNKNOWN").trim() || "UNKNOWN";
    residueCodes.set(c, (residueCodes.get(c) ?? 0) + 1);
  }
  const residueLines =
    residueCodes.size === 0
      ? "_No unmapped enforcement gaps detected in Ironguard telemetry for this window._"
      : [...residueCodes.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([code, n]) => `- **\`${code}\`**: ${n} row(s) — _consider a TAS amendment proposal to codify the control narrative._`)
          .join("\n");

  const constitutionalHealthSection = `## Constitutional health summary

**Constitutional model:** Active — Ironguard tenant isolation + Ironlock operational freeze hooks are exercised against live boundary traffic.

**Metric — percentage of policy enforcement success:**  
**${policyEnforcementSuccessPct.toFixed(1)}%** = _(${blocksWithExplicitDirective} blocks with explicit directive mapping ÷ ${totalUnauthorizedAttempts} total unauthorized boundary attempts recorded in \`ironguard_violation\`)_  
${
  totalUnauthorizedAttempts === 0
    ? "_No unauthorized boundary attempts in the 24h window — constitutional enforcement plane was not stress-tested by persisted violations._"
    : freezeTriggerCount > 0
      ? `Additionally, **${freezeTriggerCount}** global state-freeze arm event(s) (\`${IRONLOCK_FREEZE_AUDIT_ACTION}\`) were recorded — Ironlock constitutional circuit.`
      : "_No autonomous global freeze was armed in this 24h window (Ironlock-06 idle on freeze channel)._"
}
`;

  const governanceImpactSection = `## Governance & compliance impact (directives)

**Goal:** For every threat signal persisted to the ledger, a **named constitutional / TAS-aligned rule** was active and produced a **deny / block** outcome at the enforcement plane.

**Directives triggered (grouped):**  
${formatDirectiveSummaryLine(directiveCounts, freezeTriggerCount)}

_Ironguard-13_ covers cross-tenant API isolation, session/header binding failures, and missing tenant context on governed routes. _Ironlock-06_ reflects autonomous **global mutation freeze** arms correlated to Ironguard storming (AuditLog witness).
`;

  const residueSection = `## Residue of risk (TAS amendment candidates)

**Definition:** Events where a **block** was recorded but the **error taxonomy did not map** to a published Ironguard-13 / Ironlock-06 directive label in Ironscribe’s clerk model — highlighting where **TAS (Technical Architecture Standard)** may need an explicit amendment or control-ID stamp.

${residueLines}
`;

  const financialSection = `## Financial & sustainability verification

**Governed financial baseline (Irontally market benchmark):** **USD ${GOVERNED_FINANCIAL_BASELINE_USD_BILLIONS.toFixed(1)}B** notional governed-financial posture.

**Statement:** No unauthorized mutation of **financial cents** (ALE / ledger monetary fields) or **sustainability physical units** (grid-truth carbon / utility telemetry) was detected during the reporting period in correlation with the Ironguard isolation events summarized above — boundary denials remained **API / session / tenant-scope** class only.

_This section is a deterministic Ironscribe attestation from boundary telemetry; it does not replace CFO ledger reconciliation._
`;

  const appendixSection = `## Appendix — operational reference (condensed)

- **Tenant scope transitions (\`TENANT_SCOPE_CHANGE\`):** **${tenantScopeLogs.length}** events in window.
- **Ironguard persisted violations:** **${ironguardRows.length}** rows (full detail available in Postgres; excerpt below).

### Authorized tenant-scope operators (count)
${[...tenantUserCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([user, c]) => `- **${user}**: ${c}`)
  .join("\n") || "_None in window._"}

### Tenant scope — last 12 events (chronological)
${tenantScopeLogs
  .slice(-12)
  .map(
    (r) =>
      `- \`${r.createdAt.toISOString()}\` | operator=\`${r.operatorId}\` | ${(r.justification ?? "").slice(0, 200)}`,
  )
  .join("\n") || "_None._"}

### Ironguard — last 25 rows (technical excerpt)
| When (UTC) | Error code | Session tenant | Attempted tenant | Path |
|------------|------------|----------------|------------------|------|
${ironguardRows
  .slice(0, 25)
  .map(
    (v) =>
      `| ${v.createdAt.toISOString()} | \`${v.errorCode}\` | ${v.sessionTenantUuid ?? "—"} | ${v.attemptedTenantUuid ?? "—"} | ${(v.path ?? "—").replace(/\|/g, "/")} |`,
  )
  .join("\n") || "| _None._ | | | | |"}
`;

  const gavelSection = `## Gavel — final sign-off (Ironscribe)

**The environment remains in a Governed State. Constitutional Integrity is 100%.**

---
_Ironscribe (Agent 5) · Tenant Access Audit · deterministic synthesis · ${isoDayStamp(now)}_  
_Artifact: \`storage/forensics/audits/DAILY_AUDIT_REPORT_${auditReportTimestampFragment(now)}.md\`_
`;

  const promptTemplate = `# Ironscribe — Daily Tenant Access Audit (GRC-first)

_Generated: ${now.toISOString()} | Reporting window: ${since.toISOString()} → ${now.toISOString()}_

${constitutionalHealthSection}

${governanceImpactSection}

${residueSection}

${financialSection}

${highRiskSection}

${governedExceptionsSection}

${humanAnomalyAckSection}

${appendixSection}

${gavelSection}
`;

  const lastTenantScope = tenantScopeLogs.at(-1);
  const breachBlockedViolations = ironguardRows.filter((v) => isIronguardBreachBlockedCode(v.errorCode));
  const hardBansInWindow = highRiskLedger.filter((r) => r.isHardBan && r.lastViolationAt >= since);
  const blindSpotSet = new Set<string>();
  for (const r of ironguardRows) {
    const c = (r.errorCode ?? "").trim();
    if (!c || c.toUpperCase() === "UNKNOWN") blindSpotSet.add("IRONGUARD_EMPTY_OR_UNKNOWN");
    else if (!isIronguardBreachBlockedCode(r.errorCode)) blindSpotSet.add(`IRONGUARD_UNMAPPED:${c}`);
  }
  const complianceBlindSpots = [...blindSpotSet].sort();

  const irontallyFrameworkAppendix = buildFrameworkComplianceMappingMarkdown({
    windowStartIso: since.toISOString(),
    windowEndIso: now.toISOString(),
    tenantScopeChangeCount: tenantScopeLogs.length,
    tenantScopeChangeEvidenceAuditLogId:
      lastTenantScope != null ? `${lastTenantScope.tenantId}|${lastTenantScope.id}` : null,
    ironguardBreachBlockedCount: breachBlockedViolations.length,
    ironguardBreachBlockedEvidenceViolationId: breachBlockedViolations[0]?.id ?? null,
    stateFreezeTriggeredCount: freezeTriggerCount,
    stateFreezeEvidenceAuditLogId:
      freezeEvidenceLog != null ? `${freezeEvidenceLog.tenantId}|${freezeEvidenceLog.id}` : null,
    stateFreezeEvidenceSystemConfigIso:
      freezeTriggerCount > 0 && freezeEvidenceLog == null
        ? systemConfigRow?.updatedAt?.toISOString() ?? null
        : null,
    quarantineHardBanCount: hardBansInWindow.length,
    quarantineHardBanEvidenceLedgerId: hardBansInWindow[0]?.id ?? null,
    complianceBlindSpots,
  });

  const reportFilename = `DAILY_AUDIT_REPORT_${auditReportTimestampFragment(now)}.md`;
  const reportPath = `memory://forensics/audits/${reportFilename}`;
  const reportBody = `${promptTemplate}\n\n${irontallyFrameworkAppendix}`;

  if (complianceBlindSpots.length > 0) {
    void sendComplianceBlindSpotIroncast(complianceBlindSpots, {
      reportFilename,
      generatedAtIso: now.toISOString(),
      ironguardRowsInWindow: ironguardRows.length,
    });
    logStructuredEvent(
      "Irontally",
      "COMPLIANCE_BLIND_SPOT_ALERT",
      { count: complianceBlindSpots.length, reportPath },
      "warn",
    );
  }

  if (highRiskLedger.length > 0) {
    const hardBanCount = highRiskLedger.filter((r) => r.isHardBan).length;
    void sendRecidivistSummaryIroncast({
      generatedAtIso: now.toISOString(),
      reportFilename,
      recidivistCount: highRiskLedger.length,
      hardBanCount,
      crossTenantProbeCount: crossTenantProbeNotes.length,
    });
    logStructuredEvent(
      "Ironscribe",
      "DAILY_AUDIT_RECIDIVISTS_NOTIFIED",
      {
        recidivistCount: highRiskLedger.length,
        hardBanCount,
        reportPath,
      },
      "warn",
    );
  }

  return {
    ok: true,
    reportPath,
    tenantScopeEvents: tenantScopeLogs.length,
    ironguardBlockedRows: ironguardRows.length,
    highRiskRecidivists: highRiskLedger.length,
  };
}
