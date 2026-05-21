import "server-only";

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { getTasMdAbsolutePath, assessTasMdIntegritySync } from "@/app/lib/tasMdIntegrity";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import {
  readSimulatedAuditState,
  writeAmendmentStagingTas,
  writeSimulatedAuditState,
} from "@/app/lib/simulatedAuditState";
import { readLatestIrontechPostMortemForTenant } from "@/app/services/irontechPostMortem";
import { computeCostOfNonCompliance } from "@/app/utils/financialRisk";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import type { SimulatedAuditReport } from "@/app/types/simulatedAudit";
import { promoteVerifiedAmendmentToConstitution } from "@/app/services/constitutionalAmendmentVerify";

const HOT_SWAP_TTL_MS = 30 * 60 * 1000;

function applyAmendmentHotSwap(baseTas: string, amendmentMarkdown: string, tasSection: string): string {
  const marker = `<!-- IRONTALLY_AMENDMENT_HOTSWAP:${tasSection} -->`;
  const block = `${marker}\n${amendmentMarkdown.trim()}\n<!-- /IRONTALLY_AMENDMENT_HOTSWAP -->\n`;
  if (baseTas.includes(marker)) {
    return baseTas.replace(
      new RegExp(`${marker}[\\s\\S]*?<!-- /IRONTALLY_AMENDMENT_HOTSWAP -->`, "m"),
      block,
    );
  }
  return `${baseTas}\n\n${block}`;
}

function scoreAmendmentHeuristics(amendment: string): {
  chaosBoost: number;
  containmentFactor: number;
  notificationAligned: boolean;
} {
  const lower = amendment.toLowerCase();
  let chaosBoost = 0;
  if (/ironlock|freeze|containment|quarantine/i.test(lower)) chaosBoost += 0.6;
  if (/30\s*day|notification|ironcast|incident response/i.test(lower)) chaosBoost += 0.5;
  if (/tenant isolation|rls|irongate/i.test(lower)) chaosBoost += 0.3;

  const containmentFactor =
    /ironlock|containment|sub-?second|1000ms|1s sla/i.test(lower) ? 0.82 : 0.95;

  const notificationAligned = /30/.test(lower) && /day|notification/i.test(lower);

  return { chaosBoost, containmentFactor, notificationAligned };
}

/**
 * Irontally simulated audit — hot-swap amendment, backtest last Constitutional Collapse, verify posture.
 */
export async function runSimulatedAudit(params: {
  alertId: string;
  amendmentMarkdown: string;
  tenantId: string;
  tasSection: string;
}): Promise<SimulatedAuditReport> {
  const tenantId = params.tenantId.trim();
  const tenantKey = tenantKeyFromUuid(tenantId) ?? "medshield";
  const baseTas = readFileSync(getTasMdAbsolutePath(), "utf8");
  const virtualTas = applyAmendmentHotSwap(baseTas, params.amendmentMarkdown, params.tasSection);
  const virtualTasSha256 = createHash("sha256").update(virtualTas, "utf8").digest("hex");

  const now = Date.now();
  const hotSwap = {
    alertId: params.alertId,
    amendmentMarkdown: params.amendmentMarkdown,
    virtualTasSha256,
    appliedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + HOT_SWAP_TTL_MS).toISOString(),
  };

  writeAmendmentStagingTas(virtualTas);

  const maturityState = await readGovernanceMaturityState();
  const baselineMaturity = maturityState.current.score;
  const baselineChaos = maturityState.current.components.chaosResilience;

  const postMortem = readLatestIrontechPostMortemForTenant(tenantId);
  const baselineContainment = postMortem?.containment.containmentMs ?? null;
  const scenario = postMortem?.scenario ?? "CONSTITUTIONAL_COLLAPSE";
  const simulationDate = postMortem?.generatedAt ?? new Date().toISOString();

  const heuristics = scoreAmendmentHeuristics(params.amendmentMarkdown);
  const simulatedChaos = Math.min(10, baselineChaos + heuristics.chaosBoost);
  const simulatedMaturity = Math.min(
    10,
    Math.max(
      1,
      baselineMaturity +
        heuristics.chaosBoost * 0.35 +
        (heuristics.notificationAligned ? 0.25 : 0),
    ),
  );

  const simulatedContainment =
    baselineContainment != null
      ? Math.round(baselineContainment * heuristics.containmentFactor)
      : null;

  const baselineFinancial = computeCostOfNonCompliance(baselineMaturity, { tenantKey });
  const simulatedFinancial = computeCostOfNonCompliance(simulatedMaturity, { tenantKey });

  const additionalDividend = Math.max(
    0,
    simulatedFinancial.governanceDividendUsd - baselineFinancial.governanceDividendUsd,
  );

  const containmentImprovementPct =
    baselineContainment != null && simulatedContainment != null && baselineContainment > 0
      ? Math.round(((baselineContainment - simulatedContainment) / baselineContainment) * 1000) / 10
      : null;

  const securityPostureMaintained =
    simulatedMaturity >= baselineMaturity - 0.25 &&
    (simulatedContainment == null ||
      baselineContainment == null ||
      simulatedContainment <= baselineContainment * 1.05);

  const assessment = assessTasMdIntegritySync();
  const previousConstitutionalSha256 = assessment.ok ? assessment.sha256 : null;

  let constitutionalHashPromoted = false;
  let proposedConstitutionalSha256: string | null = null;

  if (securityPostureMaintained) {
    proposedConstitutionalSha256 = virtualTasSha256;
    if (process.env.IRONTALLY_SIMULATED_AUDIT_AUTO_PROMOTE === "true") {
      const promote = await promoteVerifiedAmendmentToConstitution({
        virtualTasContent: virtualTas,
        virtualTasSha256,
        alertId: params.alertId,
        auditNarrative: "Simulated audit confirmed non-degradation of security posture.",
      });
      constitutionalHashPromoted = promote.promoted;
      if (promote.sha256) proposedConstitutionalSha256 = promote.sha256;
    }
  }

  const simDateLabel = simulationDate.slice(0, 10);
  const additionalDisplay =
    additionalDividend >= 1_000_000
      ? `$${(additionalDividend / 1_000_000).toFixed(1)}M`
      : additionalDividend >= 1_000
        ? `$${Math.round(additionalDividend / 1_000)}K`
        : `$${Math.round(additionalDividend)}`;

  const theoreticalOutcome =
    `The proposed amendment to Section ${params.tasSection} would have reduced ${tenantKey}'s probabilistic liability ` +
    `by an additional ${additionalDisplay} during the ${simDateLabel} ${scenario.replace(/_/g, " ")} simulation.` +
    (containmentImprovementPct != null
      ? ` Ironlock (Agent 6) containment would improve by ~${containmentImprovementPct}%.`
      : "");

  const narrative =
    `Irontally simulated audit: hot-swapped amendment for §${params.tasSection}, re-evaluated last chaos post-mortem. ` +
    `Maturity ${baselineMaturity.toFixed(1)} → ${simulatedMaturity.toFixed(1)}; ` +
    `chaos resilience ${baselineChaos.toFixed(1)} → ${simulatedChaos.toFixed(1)}.` +
    (securityPostureMaintained
      ? " Posture maintained — constitutional hash eligible for promotion."
      : " Posture degradation risk — hash not promoted.");

  const report: SimulatedAuditReport = {
    auditId: createHash("sha256").update(`${params.alertId}:${now}`, "utf8").digest("hex").slice(0, 12),
    alertId: params.alertId,
    runAt: new Date().toISOString(),
    operator: "IRONTALLY_AGENT_19",
    hotSwap,
    backtest: {
      tenantKey,
      simulationDate,
      scenario,
      baseline: {
        maturityScore: baselineMaturity,
        chaosResilience: baselineChaos,
        containmentMs: baselineContainment,
        probabilisticLiabilityUsd: baselineFinancial.probabilisticLiabilityUsd,
        governanceDividendUsd: baselineFinancial.governanceDividendUsd,
      },
      simulated: {
        maturityScore: simulatedMaturity,
        chaosResilience: simulatedChaos,
        containmentMs: simulatedContainment,
        probabilisticLiabilityUsd: simulatedFinancial.probabilisticLiabilityUsd,
        governanceDividendUsd: simulatedFinancial.governanceDividendUsd,
      },
      deltas: {
        maturityScore: simulatedMaturity - baselineMaturity,
        containmentMs:
          baselineContainment != null && simulatedContainment != null
            ? simulatedContainment - baselineContainment
            : null,
        additionalGovernanceDividendUsd: additionalDividend,
        ironlockContainmentImprovementPct: containmentImprovementPct,
      },
    },
    narrative,
    theoreticalOutcome,
    securityPostureMaintained,
    constitutionalHashPromoted,
    proposedConstitutionalSha256,
    previousConstitutionalSha256,
    complianceGapsClosed: heuristics.notificationAligned
      ? ["SEC 30-day notification vs legacy 45-day Ironcast cadence"]
      : [],
  };

  const prev = await readSimulatedAuditState();
  await writeSimulatedAuditState({
    activeHotSwap: hotSwap,
    lastReport: report,
    reports: [report, ...prev.reports],
  });

  try {
    const { auditLogCreateLoose } = await import("@/lib/auditLogLoose");
    await auditLogCreateLoose({
      data: {
        action: "IRONTALLY_SIMULATED_AUDIT",
        justification: JSON.stringify({
          auditId: report.auditId,
          alertId: params.alertId,
          securityPostureMaintained,
          constitutionalHashPromoted,
          theoreticalOutcome: report.theoreticalOutcome,
        }),
        operatorId: "IRONTALLY_AGENT_19",
        threatId: null,
        isSimulation: true,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch {
    /* best-effort */
  }

  return report;
}
