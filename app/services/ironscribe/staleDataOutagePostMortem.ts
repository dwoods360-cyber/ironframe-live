import "server-only";

import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import { analyzeChronicSustainabilityProviderHealth } from "@/app/lib/ironscribe/chronicSustainabilityProviderHealth";
import {
  CHRONIC_PROVIDER_FAILURE_THRESHOLD,
  PRIMARY_SUSTAINABILITY_LIVE_PROVIDER_LABEL,
  SECONDARY_SUSTAINABILITY_PROVIDER_IMPLEMENTATION_PATH,
} from "@/app/lib/ironscribe/chronicSustainabilityProviderHealth";
import {
  GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS,
  GOVERNANCE_LIABILITY_RATIO,
} from "@/app/utils/financialRisk";
import { formatCentsToAccountingUSD } from "@/app/utils/formatCentsToUSD";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import { Ironmap, IRONMAP_THROTTLE_LOG_TOKEN } from "@/src/services/ironmap/blastRadius";
import { ELECTRICITY_MAPS_PROVIDER } from "@/src/services/ironmap/dependencyRegistry";
import { IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS } from "@/src/services/ironwatch/apiHeartbeat";
import { EventSource } from "@prisma/client";
import { IroncastService } from "@/services/ironcast.service";
import { integrityService } from "@/src/services/integrityService";

/** Local WORM-class mirror (upload to org bucket per ops runbooks). */
const WORM_POST_MORTEM_DIR = join(process.cwd(), "storage", "worm", "post-mortems");

const TIMELINE_ACTIONS = [
  "IRONWATCH_STALE_DATA_MODE",
  "IRONTECH_SUSTAINABILITY_STALE_LOCKDOWN",
  "LEVEL_1_FORENSIC_EVENT",
  "IRONWATCH_SUSTAINABILITY_API_RECOVERED",
  "SUSTAINABILITY_STALE_LOCKDOWN_WAIVER",
] as const;

export type StaleDataOutagePostMortemInput = {
  tenantId: string;
  /** `sustainabilityApiDegradedSince` at waiver time (stale-data window anchor). */
  outageAnchorSince: Date | null;
  tWaiver: Date;
  witnessSha256: string;
  forensicJustification: string;
  maturityScoreBefore: number | null;
  maturityScoreAfter: number | null;
};

function sha256Utf8(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function computeAvoidableAttestationGapUsd(deltaMs: number): number {
  const hours = Math.max(0, deltaMs) / 3_600_000;
  const annualHours = 365.25 * 24;
  const envelopeUsd = GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS * 1_000_000_000;
  return envelopeUsd * GOVERNANCE_LIABILITY_RATIO * (hours / annualHours);
}

function buildTasAmendmentBoilerplate(isoDatePrefix: string): string {
  return [
    "> **PROPOSED TAS AMENDMENT SNIPPET** — copy into Governance Council packet; not effective until ratified in `docs/TAS.md` per constitutional amendment protocol.",
    ``,
    `### Amendment [PROPOSED-${isoDatePrefix}]: Sustainability live-feed redundancy`,
    ``,
    "1. **Resolved.** The Trust Architecture Standard SHALL require a *certified secondary* carbon-intensity attestation path when the primary Ironwatch integration exceeds the chronic instability threshold (≥3 distinct outage episodes in any rolling 30-day window on `SystemHealthLog`).",
    `2. **Implementation.** Engineering SHALL introduce a failover orchestration module under **\`${SECONDARY_SUSTAINABILITY_PROVIDER_IMPLEMENTATION_PATH}\`** (primary: ${PRIMARY_SUSTAINABILITY_LIVE_PROVIDER_LABEL}; secondary provider contract to be named by Architecture).`,
    `3. **Attestation.** The CISO SHALL attest quarterly that failover cutover drills were executed and that ledger continuity was preserved (IntegrityEvent + WORM post-mortem family).`,
    `4. **Non-compliance.** Absent secondary path, any future Δt exceeding policy SHALL trigger automatic Executive downgrade review per Irontech / Ironcast ladders.`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| **Sponsor** | CISO / Governance Council |`,
    `| **Ironscribe reference** | Sealed POST_MORTEM (this incident) |`,
    `| **Ratification** | Supermajority + constitutional gold hash update |`,
    ``,
  ].join("\n");
}

function formatDurationMs(ms: number): string {
  if (ms < 0) return "0s (clock skew — see raw timestamps)";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

async function resolveFirstOutageHeartbeat(
  outageAnchorSince: Date | null,
): Promise<{ tOutage: Date; healthLogId: string | null }> {
  const firstFail = await prisma.systemHealthLog.findFirst({
    where: {
      serviceKey: IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS,
      ok: false,
      ...(outageAnchorSince ? { createdAt: { gte: outageAnchorSince } } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });
  if (firstFail) {
    return { tOutage: firstFail.createdAt, healthLogId: firstFail.id };
  }
  return {
    tOutage: outageAnchorSince ?? new Date(),
    healthLogId: null,
  };
}

async function loadForensicTimeline(tenantId: string, tStart: Date, tEnd: Date) {
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      createdAt: { gte: tStart, lte: tEnd },
      action: { in: [...TIMELINE_ACTIONS] },
    },
    orderBy: { createdAt: "asc" },
    take: 80,
    select: { action: true, createdAt: true, operatorId: true },
  });
}

async function ironcastPostMortemReady(adminEmail: string, tenantId: string): Promise<void> {
  const body =
    "POST-MORTEM READY: Forensic analysis of the 24h Outage has been drafted and locked in the Evidence Locker.";
  try {
    await IroncastService.dispatch({
      tenant_id: tenantId,
      sanitization_status: "VERIFIED_SYSTEM_GENERATED",
      irongate_trace_id: randomUUID(),
      recipient: { email: adminEmail, role: "SECURITY_OFFICER" },
      notification: {
        priority: "URGENT",
        subject: "POST-MORTEM READY — Stale-data outage (Ironscribe)",
        body_summary: body,
      },
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    });
  } catch (e) {
    logStructuredEvent(
      "Ironscribe",
      "post_mortem_ironcast_failed",
      { detail: e instanceof Error ? e.message : String(e) },
      "warn",
    );
  }
}

/**
 * Agent 5 (Ironscribe): draft POST_MORTEM markdown, WORM mirror, IntegrityEvent seal, CISO Ironcast.
 * Invoke immediately after tripartite stale-data waiver commits (third key validated, freeze cleared).
 */
export async function runIronscribeStaleDataOutagePostMortem(
  input: StaleDataOutagePostMortemInput,
): Promise<{ ok: true; relativePath: string; documentSha256: string } | { ok: false; error: string }> {
  try {
    const { tOutage, healthLogId } = await resolveFirstOutageHeartbeat(input.outageAnchorSince);
    const deltaMs = input.tWaiver.getTime() - tOutage.getTime();

    const timelineStart = new Date(Math.max(0, tOutage.getTime() - 48 * 3600 * 1000));
    const timeline = await loadForensicTimeline(input.tenantId, timelineStart, input.tWaiver);

    const chronic = await analyzeChronicSustainabilityProviderHealth(input.tWaiver);
    const preventativeDirectiveSuggested = chronic.isChronicallyUnstable;
    const avoidableRiskUsd = computeAvoidableAttestationGapUsd(deltaMs);
    const avoidableRiskCents = BigInt(Math.max(0, Math.round(avoidableRiskUsd * 100)));
    const avoidableRiskDisplay = formatCentsToAccountingUSD(avoidableRiskCents);

    const ironmapOutageId = `ironmap-stale-${input.witnessSha256.slice(0, 24)}`;
    const blast = await Ironmap.getBlastRadius(ironmapOutageId, {
      providerKey: ELECTRICITY_MAPS_PROVIDER,
      outageDeltaMs: deltaMs,
      tenantId: input.tenantId,
    });

    const maturityDelta =
      input.maturityScoreBefore != null && input.maturityScoreAfter != null
        ? input.maturityScoreAfter - input.maturityScoreBefore
        : null;

    const isoDate = input.tWaiver.toISOString().slice(0, 10);
    const tasAmendmentDateStamp = isoDate.replace(/-/g, "");
    const safeTenant = input.tenantId.replace(/[^a-f0-9-]/gi, "_");
    const filename = `POST_MORTEM_${isoDate}_${safeTenant}.md`;
    const apiLabel =
      "Electricity Maps live carbon-intensity API (Ironwatch service key `ELECTRICITY_MAPS_LIVE`)";

    const chronicStatusLine = chronic.isChronicallyUnstable
      ? `**CHRONICALLY UNSTABLE** — provider **${chronic.providerLabel}** recorded **${chronic.failureEpisodes}** distinct outage episodes in the last **${chronic.windowDays}** days (threshold ≥ **${CHRONIC_PROVIDER_FAILURE_THRESHOLD}**).`
      : `Within chronicity window: **${chronic.failureEpisodes}** episode(s) in **${chronic.windowDays}** days (below chronic threshold **${CHRONIC_PROVIDER_FAILURE_THRESHOLD}**).`;

    const resilienceNotice = chronic.isChronicallyUnstable
      ? `NOTICE: Provider **${chronic.providerLabel}** has reached the **Chronic Failure Threshold** (**${CHRONIC_PROVIDER_FAILURE_THRESHOLD}** events in **${chronic.windowDays}** days). **RECOMMENDED ACTION:** Implement **Secondary Provider** as a redundant failover in \`${SECONDARY_SUSTAINABILITY_PROVIDER_IMPLEMENTATION_PATH}\` (see \`src/services/sustainability/\`).`
      : `NOTICE: This is an **isolated** chronicity signal in the rolling analytics window. **Continued monitoring** recommended.`;

    const lines: string[] = [
      `# Post-Mortem: Sustainability Live API Outage & Tripartite Stale-Data Waiver`,
      ``,
      `**Tenant:** \`${input.tenantId}\``,
      `**Sealed (waiver / Ironscribe):** ${input.tWaiver.toISOString()}`,
      `**Witness (waiver payload SHA-256):** \`${input.witnessSha256}\``,
      ``,
      `## Executive Summary`,
      ``,
      `- **Total downtime Δt:** ${formatDurationMs(deltaMs)} (\`Δt = t_waiver − t_outage\`).`,
      `- **t_outage (first failed Ironwatch heartbeat in window):** ${tOutage.toISOString()}${
        healthLogId ? ` (\`SystemHealthLog.id\` = \`${healthLogId}\`)` : ""
      }`,
      `- **t_waiver (AuditLog stale-data waiver):** ${input.tWaiver.toISOString()}`,
      `- **Root cause (attested):** prolonged loss of verifiable live grid truth from **${apiLabel}**, triggering Ironwatch "Stale Data" mode, Irontech 24h state-freeze policy, and optional Ironcast constitutional escalations until tripartite waiver.`,
      `- **30-day provider health (Ironwatch \`${IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS}\`):** ${chronicStatusLine}`,
      `- **Governance maturity score:** before ≈ **${
        input.maturityScoreBefore ?? "n/a"
      }**, after waiver recalc ≈ **${input.maturityScoreAfter ?? "n/a"}**${
        maturityDelta != null ? ` (Δ = **${maturityDelta >= 0 ? "+" : ""}${maturityDelta.toFixed(2)}**)` : ""
      }.`,
      ``,
      `## Forensic Timeline`,
      ``,
      `Ordered platform audit signals (subset; full chain in \`AuditLog\`):`,
      ``,
    ];

    if (!timeline.length) {
      lines.push(`_No matching timeline rows in-range (tenant-scoped); consult global SystemConfig witnesses._`, ``);
    } else {
      for (const row of timeline) {
        lines.push(
          `- **${row.createdAt.toISOString()}** — \`${row.action}\` — operator \`${row.operatorId}\``,
        );
      }
      lines.push(``);
    }

    lines.push(
      `**Canonical sequence (reference):** API heartbeat failures → Stale Data mode → consecutive wall-clock degradation → **24h Irontech threshold** → State freeze / Ironlock read-only posture → **Ironcast Level-1 forensic escalation (PagerDuty / voice ladder if armed)** → **Tripartite Vault + CISO + Staff waiver** (this document).`,
      ``,
      `## Justification Audit`,
      ``,
      `- **Stale-data waiver policy:** Operations resume under explicit tripartite emergency seal, witnessed CISO/Staff fingerprints, collusion/MFA gates, and Ironlock **≥100 character** forensic justification while the live feed remains unhealthy.`,
      `- **Tripartite key-holders (roles only — segments not reproduced):**`,
      `  1. **Vault custodian** (22-hex vault segment)`,
      `  2. **CISO custodian** (21-hex segment + EntryWitness fingerprint)`,
      `  3. **Staff custodian** (21-hex segment + EntryWitness fingerprint)`,
      ``,
      `### Recorded forensic justification (waivers)`,
      ``,
      "```text",
      input.forensicJustification,
      "```",
      ``,
      `## Gavel — Δt × attestation gap (avoidable financial risk)`,
      ``,
      `**Linkage:** Without a **certified secondary** live-feed path, the platform carried **full reliance** on **${PRIMARY_SUSTAINABILITY_LIVE_PROVIDER_LABEL}** for the entire Δt window. The constitutional governance exposure envelope (**$${GOVERNANCE_EXPOSURE_ENVELOPE_BILLIONS}B** — TAS reference envelope) and statutory liability ratio (**${(
        GOVERNANCE_LIABILITY_RATIO * 100
      ).toFixed(0)}%** of baseline) yield an **illustrative avoidable attestation-gap liability** for this downtime:`,
      ``,
      `- **Formula (proportional hours):** \`AvoidableRisk ≈ Envelope_USD × ${GOVERNANCE_LIABILITY_RATIO} × (Δt_hours / 8766)\` (8766 ≈ hours/year).`,
      `- **Computed (Ironscribe clerk model):** **${avoidableRiskDisplay}** over **${(Math.max(0, deltaMs) / 3_600_000).toFixed(2)}** outage hours.`,
      ``,
      `_Narrative: this figure isolates the **cost of not failing over** to redundant attestation during Δt — a governance dividend erosion line for CISO / CFO joint review._`,
      ``,
      `> **Ironmap workforce Gavel:** This outage impacted **${blast.workforceImpactedPct.toFixed(
        1,
      )}%** of the Ironframe workforce (**${blast.workforceImpactedCount}** / **${
        blast.workforceTotalAgents
      }** constitutional roster specialists on the ${PRIMARY_SUSTAINABILITY_LIVE_PROVIDER_LABEL} blast radius). The **$${blast.baselineBillionsUsd.toFixed(
        1,
      )}B** governance baseline experienced **${blast.totalReportingLatencyHours.toFixed(
        2,
      )}** hours of **total reporting latency** (cumulative per-agent delay debt while the primary API was unavailable). **Decoupling Dividend (roster ceiling):** **${blast.decouplingDividendPct.toFixed(
        1,
      )}%** of specialists could remain productive when parallel **Regulatory_Framework_Mapping** lanes stay **ACTIVE** while **Sustainability_Mapping** is **WAIT** (goal: drive **Idle Debt** to **zero**).`,
      ``,
      `## Section 4: Resilience Recommendations`,
      ``,
      resilienceNotice,
      ``,
      preventativeDirectiveSuggested
        ? `- **Preventative directive:** Flag **Resilience Gap** — expedite secondary provider design review and Ironwatch failover policy.`
        : `- **Preventative directive:** None beyond continued Ironwatch SLO monitoring.`,
      ``,
      `## Section 5: Cascading Impact & Blast Radius`,
      ``,
      `_Ironmap (Agent 9) correlation:_ \`${ironmapOutageId}\` · provider **${blast.providerKey}** · tenant \`${input.tenantId}\`.`,
      ``,
      `- **Cumulative Delay Debt:** **${blast.delayDebtTotalHours.toFixed(2)}** h (**${blast.delayDebtTotalMs.toLocaleString()}** ms). Model: each downstream LangGraph node accrues one full Δt wait (parallel carbon / chain-of-custody stall).`,
      `- **Vendor Dependency Volatility Score:** **${blast.dependencyVolatilityScore}** — **${blast.volatilityMultiplierVsSingle.toFixed(0)}×** the blast radius of a hypothetical vendor touching only **one** downstream agent.`,
      `- **LangGraph state inference:** Rows marked **THROTTLED** when optional checkpoint \`agent_logs\` contain \`${IRONMAP_THROTTLE_LOG_TOKEN}\` for that node; **WAIT_LISTED** when Ironmap attests a carbon gate; **STALL_ATTRIBUTED** for non-carbon adjunct stalls.`,
      ``,
      blast.mermaidBlock,
      ``,
      blast.markdownTable,
      ``,
      `_Roster note: validation node \`warden\` is listed for LangGraph completeness; roster impact counts only agents indexed in \`CORE_WORKFORCE_AGENTS\` (19)._`,
      ``,
      `### Agent decoupling & Idle Debt (Ironmap)`,
      ``,
      `- **Idle Debt (Σ):** **${blast.idleDebtTotalHours.toFixed(2)}** h — time parallel-regulatory-eligible agents spent effectively **idle** while waiting on a **carbon resource their current regulatory / SOC2 sub-tasks did not require** (elimination target: **0**).`,
      `- **Tasks feasible during outage (if decoupling fully optimized):** Per \`criticalPath.ts\`, with **ElectricityMaps.status = DOWN**, **Regulatory_Framework_Mapping** remains **ACTIVE**; specialists flagged \`parallelRegulatoryEligible\` could advance framework controls, vault mapping, and Irontally SOC2 threads without live carbon.`,
      `- **Ironcore partial transitions:** Payloads may set \`ironmap_regulatory_parallel: true\` or \`regulatory_framework_only: true\` so Agent 1 routes **IRONTRUST** when sustainability is **WAIT** instead of stalling the graph on **IRONBLOOM**.`,
      ``,
      ...(blast.strategicAdviceLines.length
        ? [`**Strategic advice (draft):**`, ``, ...blast.strategicAdviceLines.map((l) => `- ${l}`), ``]
        : []),
      `## Section 6: TAS Amendment Proposal (Draft)`,
      ``,
      buildTasAmendmentBoilerplate(tasAmendmentDateStamp),
      ``,
      `## Cryptographic seal & WORM archival`,
      ``,
      `- **WORM mirror path:** \`storage/worm/post-mortems/${filename}\``,
      `- **IntegrityEvent:** appended with \`event_type = POST_MORTEM_STALE_DATA_OUTAGE_WORM\` and payload hash chaining.`,
      ``,
      `---`,
      ``,
      `*Ironscribe (Agent 5) — automated narrative; clerical attestation under GRC ledger policy.*`,
      ``,
    );

    const markdown = lines.join("\n");
    const documentSha256 = sha256Utf8(markdown);

    if (!existsSync(WORM_POST_MORTEM_DIR)) {
      mkdirSync(WORM_POST_MORTEM_DIR, { recursive: true });
    }
    const absPath = join(WORM_POST_MORTEM_DIR, filename);
    writeFileSync(absPath, markdown, "utf8");
    const relativePath = join("worm", "post-mortems", filename).replace(/\\/g, "/");

    await prisma.$transaction(async (tx) => {
      await integrityService.createLedgerEntry(tx, {
        tenantId: input.tenantId,
        eventType: "POST_MORTEM_STALE_DATA_OUTAGE_WORM",
        entityType: "IRONSCRIBE_POST_MORTEM",
        entityId: documentSha256,
        actorUserId: "IRONSCRIBE_AGENT_5",
        source: EventSource.SYSTEM,
        payload: {
          kind: "STALE_DATA_OUTAGE_TRIPARTITE_WAIVER",
          relativePath,
          documentSha256,
          witnessSha256: input.witnessSha256,
          tOutageIso: tOutage.toISOString(),
          tWaiverIso: input.tWaiver.toISOString(),
          deltaMs,
          electricityMapsServiceKey: IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS,
          systemHealthLogWitnessId: healthLogId,
          chronicFailureEpisodes30d: chronic.failureEpisodes,
          chronicProviderWindowDays: chronic.windowDays,
          isChronicallyUnstable: chronic.isChronicallyUnstable,
          preventativeDirectiveSuggested,
          avoidableAttestationGapUsdApprox: avoidableRiskUsd,
          avoidableAttestationGapDisplay: avoidableRiskDisplay,
          ironmapOutageId,
          ironmapDelayDebtHours: blast.delayDebtTotalHours,
          ironmapDependencyVolatilityScore: blast.dependencyVolatilityScore,
          ironmapWorkforceImpactedPct: blast.workforceImpactedPct,
          ironmapIdleDebtHours: blast.idleDebtTotalHours,
          ironmapDecouplingDividendPct: blast.decouplingDividendPct,
        },
      });
    });

    await auditLogCreateLoose({
      data: {
        action: "IRONSCRIBE_POST_MORTEM_STALE_DATA_OUTAGE",
        justification: JSON.stringify({
          agent: "IRONSCRIBE_AGENT_5",
          relativePath,
          documentSha256,
          witnessSha256: input.witnessSha256,
          preventativeDirectiveSuggested,
          chronicFailureEpisodes30d: chronic.failureEpisodes,
          chronicProviderWindowDays: chronic.windowDays,
          isChronicallyUnstable: chronic.isChronicallyUnstable,
          avoidableAttestationGapDisplay: avoidableRiskDisplay,
          avoidableAttestationGapUsdApprox: avoidableRiskUsd,
          ironmapOutageId,
          ironmapDelayDebtHours: blast.delayDebtTotalHours,
          ironmapDependencyVolatilityScore: blast.dependencyVolatilityScore,
          ironmapWorkforceImpactedPct: blast.workforceImpactedPct,
          ironmapIdleDebtHours: blast.idleDebtTotalHours,
          ironmapDecouplingDividendPct: blast.decouplingDividendPct,
          ironscribeClerkSummary:
            "Ironscribe (Agent 5) + Ironmap (Agent 9): POST_MORTEM markdown drafted after tripartite stale-data waiver; WORM mirror written; IntegrityEvent sealed; blast radius and preventative directive metadata attached.",
        }),
        operatorId: "IRONSCRIBE_AGENT_5",
        threatId: null,
        isSimulation: false,
      },
    });

    const adminRow = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { adminAlertEmail: true },
    });
    const adminEmail =
      adminRow?.adminAlertEmail?.trim() ||
      process.env.THREAT_CONFIRMATION_RECIPIENTS?.split(",")[0]?.trim() ||
      process.env.IRONCAST_SMOKE_RECIPIENT?.trim();
    if (adminEmail) {
      await ironcastPostMortemReady(adminEmail, input.tenantId);
    } else {
      logStructuredEvent("Ironscribe", "post_mortem_notify_skipped", { reason: "no_admin_email" }, "warn");
    }

    logStructuredEvent(
      "Ironscribe",
      "post_mortem_sealed",
      { relativePath, documentSha256: documentSha256.slice(0, 12) },
      "info",
    );

    return { ok: true, relativePath, documentSha256 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logStructuredEvent("Ironscribe", "post_mortem_failed", { detail: msg }, "error");
    return { ok: false, error: msg };
  }
}
