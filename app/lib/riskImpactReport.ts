import "server-only";

import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";

/** Control redundancy reduction multiplier (3-key → 2-key downgrade). */
export const POSTURE_DOWNGRADE_ALE_MULTIPLIER = 1.4;

export type RiskImpactRow = {
  asset: string;
  assetKey: "medshield" | "vaultbank" | "gridcore";
  currentAleCents: bigint;
  newAleCents: bigint;
  increaseCents: bigint;
  currentAleDisplay: string;
  newAleDisplay: string;
  increaseDisplay: string;
};

export type RiskImpactReport = {
  generatedAt: string;
  multiplier: number;
  rows: RiskImpactRow[];
  totalIncreaseCents: bigint;
  totalIncreaseDisplay: string;
};

const DOWNGRADE_BASELINES = ["medshield", "vaultbank", "gridcore"] as const;

function formatUsdMillions(cents: bigint): string {
  const dollars = Number(cents) / 100;
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(2)}M`;
  }
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatSignedIncrease(cents: bigint): string {
  const prefix = cents >= 0n ? "+" : "";
  return `${prefix}${formatUsdMillions(cents < 0n ? -cents : cents)}`;
}

const ASSET_LABELS: Record<(typeof DOWNGRADE_BASELINES)[number], string> = {
  medshield: "Medshield",
  vaultbank: "Vaultbank",
  gridcore: "Gridcore",
};

export function generatePostureDowngradeRiskImpactReport(): RiskImpactReport {
  const rows: RiskImpactRow[] = DOWNGRADE_BASELINES.map((key) => {
    const current = TENANT_INDUSTRY_BASELINE_ALE_CENTS[key];
    const newAle = BigInt(Math.round(Number(current) * POSTURE_DOWNGRADE_ALE_MULTIPLIER));
    const increase = newAle - current;
    return {
      asset: ASSET_LABELS[key],
      assetKey: key,
      currentAleCents: current,
      newAleCents: newAle,
      increaseCents: increase,
      currentAleDisplay: formatUsdMillions(current),
      newAleDisplay: formatUsdMillions(newAle),
      increaseDisplay: formatSignedIncrease(increase),
    };
  });

  const totalIncreaseCents = rows.reduce((acc, r) => acc + r.increaseCents, 0n);

  return {
    generatedAt: new Date().toISOString(),
    multiplier: POSTURE_DOWNGRADE_ALE_MULTIPLIER,
    rows,
    totalIncreaseCents,
    totalIncreaseDisplay: formatSignedIncrease(totalIncreaseCents),
  };
}
