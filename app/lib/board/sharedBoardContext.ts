import "server-only";

import prisma from "@/lib/prisma";
import { getFrameworkControlMappings } from "@/app/config/irontallyFrameworkControls";
import type { IrontallyFrameworkId } from "@/app/config/irontallyFrameworkControls";
import { compileFrameworkReadiness } from "@/src/services/compliance/irontallyEngine";
import type { FrameworkReadinessSummary } from "@/app/types/irontallyReadiness";
import { getScopedTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

/** Immutable corporate ALE baselines (whole-integer USD cents). */
export const BOARD_ALE_BASELINES_CENTS = {
  medshield: 1110000000n,
  vaultbank: 590000000n,
  gridcore: 470000000n,
} as const;

export type BoardComplianceFrameworkName =
  | "DORA"
  | "CMMC"
  | "EU_AI_ACT"
  | "NYDFS_PART_500"
  | "UK_CSR";

export type BoardComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "STAGED_DRAFT";

export interface BoardContextPayload {
  tenantId: string;
  timestamp: string;
  systemStatus: "ARCHITECTURE ENFORCED";
  financials: {
    baselines: typeof BOARD_ALE_BASELINES_CENTS;
    currentExposureCents: bigint;
  };
  technical: {
    criticalThreatCount: number;
    activeVulnerabilities: Array<{
      id: string;
      cveId: string;
      description: string;
      blastRadiusCents: bigint;
    }>;
  };
  compliance: {
    frameworks: Array<{
      name: BoardComplianceFrameworkName;
      status: BoardComplianceStatus;
      completionPercentage: number;
    }>;
  };
  sustainability: {
    powerUsageKwh: bigint;
    fluidConsumptionLiters: bigint;
  };
}

const CVE_PATTERN = /CVE-\d{4}-\d+/i;

const BOARD_FRAMEWORK_BINDINGS: Array<{
  name: BoardComplianceFrameworkName;
  irontallyId: IrontallyFrameworkId | null;
}> = [
  { name: "DORA", irontallyId: "dora" },
  { name: "CMMC", irontallyId: null },
  { name: "EU_AI_ACT", irontallyId: "eu_ai_act" },
  { name: "NYDFS_PART_500", irontallyId: "nydfs_500" },
  { name: "UK_CSR", irontallyId: "uk_csr" },
];

const TERMINAL_THREAT_STATES = new Set(["RESOLVED", "CLOSED_ARCHIVED"]);

function parseIngestionPayload(raw: string | null): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function extractCveIdFromThreat(ingestionDetails: string | null, title: string): string {
  const payload = parseIngestionPayload(ingestionDetails);
  if (typeof payload.cve === "string" && payload.cve.trim()) {
    return payload.cve.trim().toUpperCase();
  }
  if (typeof payload.cve_id === "string" && payload.cve_id.trim()) {
    return payload.cve_id.trim().toUpperCase();
  }
  const haystack = JSON.stringify({ ...payload, title });
  const match = haystack.match(CVE_PATTERN);
  return match ? match[0].toUpperCase() : "CVE-UNKNOWN";
}

function isCriticalThreat(score: number, financialRiskCents: bigint): boolean {
  return score >= 70 || financialRiskCents >= 100_000_000n;
}

function completionPercentage(passing: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((passing / total) * 100)));
}

function resolveComplianceStatus(
  irontallyId: IrontallyFrameworkId | null,
  passing: number,
  total: number,
): BoardComplianceStatus {
  if (!irontallyId) return "STAGED_DRAFT";
  if (total <= 0) return "STAGED_DRAFT";
  if (passing >= total) return "COMPLIANT";
  return "NON_COMPLIANT";
}

/** JSON-safe board payload (BigInt → decimal string). */
export function serializeBoardContextPayload(payload: BoardContextPayload): string {
  return JSON.stringify(payload, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

/**
 * Aggregates multi-agent technical telemetry from the Ironframe workforce
 * into a democratic shared context bus for the 17 IronBoard executive personas.
 * Enforces strict tenant isolation and BigInt financial invariants.
 */
export async function getSharedBoardContext(): Promise<BoardContextPayload> {
  const tenantId = await getScopedTenantUuidFromCookies();
  if (!tenantId) {
    throw new Error("UNAUTHORIZED_ACCESS: Tenant isolation boundary breached or context missing.");
  }

  const companies = await prisma.company.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const companyIds = companies.map((row) => row.id);

  const [tenantRow, threatRows, readinessRows, sustainabilityAgg] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ale_baseline: true },
    }),
    companyIds.length > 0
      ? prisma.threatEvent.findMany({
          where: {
            tenantCompanyId: { in: companyIds },
            status: { notIn: [...TERMINAL_THREAT_STATES] },
          },
          select: {
            id: true,
            title: true,
            score: true,
            financialRisk_cents: true,
            ingestionDetails: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    compileFrameworkReadiness(tenantId).catch(() => []),
    companyIds.length > 0
      ? prisma.sustainabilityMetric.aggregate({
          where: {
            threat: { tenantCompanyId: { in: companyIds } },
          },
          _sum: { kwhAverted: true, coolingWaterLiters: true },
        })
      : Promise.resolve({ _sum: { kwhAverted: null, coolingWaterLiters: null } }),
  ]);

  const activeThreatExposure = threatRows.reduce(
    (sum, row) => sum + row.financialRisk_cents,
    0n,
  );
  const tenantBaseline = tenantRow?.ale_baseline ?? 0n;
  const currentExposureCents =
    activeThreatExposure > 0n ? activeThreatExposure : tenantBaseline;

  const criticalThreats = threatRows.filter((row) =>
    isCriticalThreat(row.score, row.financialRisk_cents),
  );

  const readinessByLabel = new Map(
    readinessRows.map((row) => [row.framework, row] as const),
  );

  const irontallyReadinessLabel: Partial<
    Record<IrontallyFrameworkId, FrameworkReadinessSummary["framework"]>
  > = {
    dora: "DORA",
    eu_ai_act: "EU_AI_ACT",
    nydfs_500: "NYDFS_500",
    uk_csr: "UK_CSR",
  };

  const frameworks = BOARD_FRAMEWORK_BINDINGS.map((binding) => {
    if (!binding.irontallyId) {
      return {
        name: binding.name,
        status: "STAGED_DRAFT" as const,
        completionPercentage: 0,
      };
    }

    const readinessLabel = irontallyReadinessLabel[binding.irontallyId];
    const readiness = readinessLabel ? readinessByLabel.get(readinessLabel) : undefined;
    const total =
      readiness?.totalControlsMonitored ??
      getFrameworkControlMappings(binding.irontallyId).length;
    const passing = readiness?.passingControlsCount ?? 0;

    return {
      name: binding.name,
      status: resolveComplianceStatus(binding.irontallyId, passing, total),
      completionPercentage: completionPercentage(passing, total),
    };
  });

  const powerUsageKwh = sustainabilityAgg._sum.kwhAverted ?? 0n;
  const fluidLitersRaw = sustainabilityAgg._sum.coolingWaterLiters ?? 0;
  const fluidConsumptionLiters = BigInt(Math.round(fluidLitersRaw));

  return {
    tenantId,
    timestamp: new Date().toISOString(),
    systemStatus: "ARCHITECTURE ENFORCED",
    financials: {
      baselines: BOARD_ALE_BASELINES_CENTS,
      currentExposureCents,
    },
    technical: {
      criticalThreatCount: criticalThreats.length,
      activeVulnerabilities: criticalThreats.map((threat) => ({
        id: threat.id,
        cveId: extractCveIdFromThreat(threat.ingestionDetails, threat.title),
        description: threat.title,
        blastRadiusCents: threat.financialRisk_cents,
      })),
    },
    compliance: { frameworks },
    sustainability: {
      powerUsageKwh,
      fluidConsumptionLiters,
    },
  };
}
