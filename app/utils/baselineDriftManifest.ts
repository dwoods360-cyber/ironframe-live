import type { TenantKey } from "@/app/utils/tenantIsolation";
import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";

/** Δ = active ALE − industry baseline (bigint cents). Negative ⇒ posture below baseline (optimized). */
export function computeBaselineDriftDeltaCents(activeAleCents: bigint, tenantKey: TenantKey): bigint {
  return activeAleCents - TENANT_INDUSTRY_BASELINE_ALE_CENTS[tenantKey];
}

function formatAbsUsdCompactFromCents(absCents: bigint): string {
  if (absCents <= 0n) return "$0";
  const centsPerDollar = 100n;
  const dollarsInt = absCents / centsPerDollar;
  const dollars = Number(dollarsInt);
  if (!Number.isFinite(dollars)) return "$0";

  if (dollars >= 100_000) {
    const m = dollars / 1_000_000;
    return `$${m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    const k = dollars / 1000;
    return `$${k >= 100 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

export type ManifestDriftTone = "emerald" | "amber" | "neutral";

export function formatBaselineDriftManifestParts(
  activeAleCents: bigint,
  tenantKey: TenantKey,
): { text: string; tone: ManifestDriftTone } {
  const delta = computeBaselineDriftDeltaCents(activeAleCents, tenantKey);
  if (delta === 0n) {
    return { text: "Δ $0", tone: "neutral" };
  }
  const sign = delta < 0n ? "-" : "+";
  const abs = delta < 0n ? -delta : delta;
  return {
    text: `Δ ${sign}${formatAbsUsdCompactFromCents(abs)}`,
    tone: delta < 0n ? "emerald" : "amber",
  };
}

/** Version-manifest `ALE_ENGINE` line — frozen BIGINT ¢ anchor for the bound tenant (Audit Intelligence footer). */
export function formatAleEngineManifestLine(activeTenantKey: TenantKey | null): string {
  if (!activeTenantKey) {
    return "ALE_ENGINE: BIGINT_DETERMINISTIC (ANCHOR UNBOUND — BIND TENANT FOR BASELINE ¢)";
  }
  const cents = TENANT_INDUSTRY_BASELINE_ALE_CENTS[activeTenantKey];
  return `ALE_ENGINE: BIGINT_DETERMINISTIC (${cents.toString()} ¢)`;
}
