import type { GovernanceMaturitySnapshot } from "@/app/types/governanceMaturity";

export type GrcTenantBaselineKey = "vaultbank" | "medshield" | "gridcore";

/** Deterministic GRC maturity baselines per corporate tenant context. */
export const GRC_TENANT_BASELINES: Record<
  GrcTenantBaselineKey,
  { system: string; attestation: string; chaos: string; directivity: string }
> = {
  vaultbank: { system: "4.5 / 10", attestation: "6 / 10", chaos: "6 / 10", directivity: "6 / 10" },
  medshield: { system: "6.8 / 10", attestation: "8 / 10", chaos: "4 / 10", directivity: "7 / 10" },
  gridcore: { system: "2.7 / 10", attestation: "3 / 10", chaos: "6 / 10", directivity: "5 / 10" },
};

function parseMaturityFraction(value: string): number {
  const head = value.split("/")[0]?.trim() ?? "0";
  const parsed = Number.parseFloat(head);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeTenantMaturityKey(
  activeTenantKey: string | null | undefined,
  activeTenantUuid?: string | null,
  tenantNameHint?: string | null,
): GrcTenantBaselineKey {
  const currentKey = (activeTenantKey ?? tenantNameHint ?? activeTenantUuid ?? "vaultbank").toLowerCase();
  if (currentKey.includes("vault")) return "vaultbank";
  if (currentKey.includes("med")) return "medshield";
  if (currentKey.includes("grid")) return "gridcore";
  return "vaultbank";
}

export function tenantBaselineToSnapshot(key: GrcTenantBaselineKey): GovernanceMaturitySnapshot {
  const baseline = GRC_TENANT_BASELINES[key];
  return {
    score: parseMaturityFraction(baseline.system),
    calculatedAt: new Date().toISOString(),
    components: {
      attestationQuality: parseMaturityFraction(baseline.attestation),
      chaosResilience: parseMaturityFraction(baseline.chaos),
      directivity: parseMaturityFraction(baseline.directivity),
    },
    weights: { attestation: 0.4, chaos: 0.3, directivity: 0.3 },
    governanceDegradationActive: false,
    neutralizeMinChars: 80,
    sampleSizes: { resolutionsSampled: 12, chaosReportAvailable: true },
  };
}
