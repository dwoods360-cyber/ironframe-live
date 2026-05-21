import { TAS_CONSTITUTIONAL_OBLIGATIONS } from "@/app/config/tasConstitutionalObligations";
import {
  MN_BPS_BENCHMARK_DEADLINE_ISO,
  MN_BPS_COVERED_BUILDING_MIN_SQFT,
  TENANT_MINNESOTA_BPS_ELIGIBLE_SQFT,
} from "@/app/config/minnesotaBpsCoverage";
import { stableRegulatoryItemId } from "@/app/lib/complianceDriftState";
import type { RegulatoryDriftAlert } from "@/app/types/complianceDrift";
import type { TenantKey } from "@/app/utils/tenantIsolation";
import { anonymizeForPublicExport } from "@/src/services/ironscribe/publicFormatter";

const obligation =
  TAS_CONSTITUTIONAL_OBLIGATIONS.find((o) => o.id === "sustainability_building_benchmark") ??
  TAS_CONSTITUTIONAL_OBLIGATIONS[0];

/** Primary automated evidence for Minnesota-style benchmarking filings (Ironscribe PDF pipeline). */
export const IRONBLOOM_MINNESOTA_FILING_EVIDENCE_REF =
  "Sustainability_Achievement_Report_V1 (WORM) — schedule POST /api/internal/cron/sustainability-achievement-report";

/**
 * Ironsight (Agent 8) — synthetic CRITICAL drift for Minnesota portfolios over 50k sq ft (June 1, 2026 horizon).
 */
export function buildMinnesotaBpsComplianceAlerts(): RegulatoryDriftAlert[] {
  const alerts: RegulatoryDriftAlert[] = [];
  const keys = Object.keys(TENANT_MINNESOTA_BPS_ELIGIBLE_SQFT) as TenantKey[];

  for (const tenantKey of keys) {
    const sq = TENANT_MINNESOTA_BPS_ELIGIBLE_SQFT[tenantKey];
    if (sq == null || sq <= MN_BPS_COVERED_BUILDING_MIN_SQFT) continue;

    const title = anonymizeForPublicExport(
      `Minnesota BPS / Clean Buildings benchmarking deadline — covered portfolio (${tenantKey})`,
    );
    const link = "https://www.leg.mn.gov/laws";
    const id = stableRegulatoryItemId("Ironsight:MN-BPS-2026", tenantKey, MN_BPS_BENCHMARK_DEADLINE_ISO);

    const lawSummary = `CRITICAL: Minnesota-covered footprint ~${sq.toLocaleString()} sq ft must satisfy June 1, 2026 benchmarking / BPS-adjacent filing expectations.`;

    const pulseMessage =
      `IRONSIGHT (Agent 8): Minnesota BPS horizon — file or reconcile benchmarking evidence before ${MN_BPS_BENCHMARK_DEADLINE_ISO.slice(0, 10)}. ` +
      `Primary filing artifact: ${IRONBLOOM_MINNESOTA_FILING_EVIDENCE_REF}.`;

    alerts.push({
      id,
      detectedAt: new Date().toISOString(),
      source: "Ironsight — Minnesota BPS Sentinel",
      sourceUrl: link,
      lawSummary,
      lawExcerpt: pulseMessage,
      tasSection: obligation.tasSection,
      tasSectionTitle: obligation.tasSectionTitle,
      tasAnchorId: obligation.anchorId,
      tasLine: obligation.tasLine,
      tasCurrentPosture: obligation.currentPosture,
      agentLabel: "Ironsight (Agent 8)",
      isDriftDetected: true,
      severity: "CRITICAL",
      deadline: MN_BPS_BENCHMARK_DEADLINE_ISO,
      status: "ACTIVE",
      pulseMessage,
      keywordHits: ["minnesota", "bps", "benchmarking", "june 2026", "ironbloom"],
      obligationId: obligation.id,
    });
  }

  return alerts;
}
