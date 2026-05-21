import "server-only";

import { calculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { getDashboardPayloadForTenant } from "@/app/actions/dashboardActions";
import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";
import type { RiskCardDisplayStatus, RiskDeckCardItem } from "@/app/types/riskCard";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";
import {
  formatFrameworkLabelForCard,
  formatGovernedLiabilityForCard,
  systemIntegrityDrillFromIngestion,
  systemIntegrityDrillFromTitle,
} from "@/app/utils/riskCardEnrichment";

function scoreToCardStatus(score: number): RiskCardDisplayStatus {
  if (score >= 8) return "VERIFIED";
  if (score >= 5) return "PROCESSING";
  return "ASSIGNED";
}

function pendingIntegrityCard(scope: string): RiskDeckCardItem {
  return {
    id: `pending-integrity-${scope.toLowerCase().replace(/\s+/g, "-")}`,
    processedData: {
      title: scope,
      value: "Pending Integrity",
      delta: "Ingress recalc unavailable",
      status: "PENDING_INTEGRITY",
    },
  };
}

export function maturitySnapshotToDeckCards(snapshot: GovernanceMaturitySnapshot): RiskDeckCardItem[] {
  const degradation = snapshot.governanceDegradationActive ? "↓ Governance drift" : "Within band";
  return [
    {
      id: "maturity-system",
      processedData: {
        title: "System Maturity",
        value: `${snapshot.score.toFixed(1)} / 10`,
        delta: degradation,
        status: scoreToCardStatus(snapshot.score),
      },
    },
    {
      id: "maturity-attestation",
      processedData: {
        title: "Attestation Quality",
        value: `${snapshot.components.attestationQuality} / 10`,
        delta: `${snapshot.sampleSizes.resolutionsSampled} resolutions sampled`,
        status: scoreToCardStatus(snapshot.components.attestationQuality),
      },
    },
    {
      id: "maturity-chaos",
      processedData: {
        title: "Chaos Resilience",
        value: `${snapshot.components.chaosResilience} / 10`,
        delta: snapshot.sampleSizes.chaosReportAvailable ? "Post-mortem on file" : "No chaos report",
        status: scoreToCardStatus(snapshot.components.chaosResilience),
      },
    },
    {
      id: "maturity-directivity",
      processedData: {
        title: "Directivity",
        value: `${snapshot.components.directivity} / 10`,
        delta: `Min neutralize ${snapshot.neutralizeMinChars} chars`,
        status: scoreToCardStatus(snapshot.components.directivity),
      },
    },
  ];
}

type ThreatStripRow = {
  id: string;
  title: string;
  status?: string | null;
  financialRiskCents?: string;
  complianceFramework?: string;
  governedImpactCents?: string;
  ingestionDetails?: string | null;
};

function threatStatusToCardStatus(status: string | null | undefined): RiskCardDisplayStatus {
  const st = (status ?? "").trim().toUpperCase();
  if (["RESOLVED", "MITIGATED", "CLOSED", "CLOSED_ARCHIVED", "VERIFIED"].includes(st)) {
    return "VERIFIED";
  }
  if (["ACTIVE", "IN_PROGRESS", "PROCESSING", "ASSIGNED", "OPEN"].includes(st)) {
    return "PROCESSING";
  }
  return "ASSIGNED";
}

export function threatEventsToDeckCards(rows: ThreatStripRow[], limit = 8): RiskDeckCardItem[] {
  return rows.slice(0, limit).map((row) => {
    const cents = row.financialRiskCents ?? "0";
    let value = "$0.00";
    try {
      value = formatCentsToUSD(cents);
    } catch {
      value = "Pending Integrity";
    }
    const framework = (row.complianceFramework ?? "NIST").trim() || "NIST";
    const systemIntegrityDrill =
      systemIntegrityDrillFromIngestion(row.ingestionDetails ?? null) ??
      systemIntegrityDrillFromTitle(row.title);
    return {
      id: `threat-${row.id}`,
      processedData: {
        title: row.title,
        value,
        delta: threatStatusToCardStatus(row.status) === "VERIFIED" ? "Verified" : "Exposure",
        status: threatStatusToCardStatus(row.status),
        frameworkLabel: formatFrameworkLabelForCard(framework),
        governedLiability: formatGovernedLiabilityForCard(row.governedImpactCents),
        systemIntegrityDrill,
      },
    };
  });
}

/**
 * Server ingress: maturity scoring + threat strip → dumb deck holders.
 * Failures yield PENDING_INTEGRITY cards instead of throwing to the client.
 */
export async function ingestRiskDeckForTenant(
  tenantUuid: string | null,
): Promise<RiskDeckCardItem[]> {
  const cards: RiskDeckCardItem[] = [];

  try {
    const snapshot = await calculateSystemMaturityScore(tenantUuid ?? undefined);
    cards.push(...maturitySnapshotToDeckCards(snapshot));
  } catch {
    cards.push(pendingIntegrityCard("Governance Maturity"));
  }

  if (!tenantUuid?.trim()) {
    return cards;
  }

  try {
    const dashboard = await getDashboardPayloadForTenant(tenantUuid.trim());
    cards.push(...threatEventsToDeckCards(dashboard.threatEvents ?? []));
  } catch {
    cards.push(pendingIntegrityCard("Risk Events"));
  }

  return cards;
}

/** Server ingress: governance maturity snapshot for the forensic strip (no threat deck cards). */
export async function ingestGovernanceMaturityForTenant(
  tenantUuid: string | null,
): Promise<GovernanceMaturitySnapshot | null> {
  try {
    return await calculateSystemMaturityScore(tenantUuid ?? undefined);
  } catch {
    return null;
  }
}
