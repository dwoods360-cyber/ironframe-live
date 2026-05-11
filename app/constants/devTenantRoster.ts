import type { TenantKey } from "@/app/utils/tenantIsolation";

/** Constitutional frozen ALE anchors (TAS) — display-only for Dev Control Chips. */
export type DevTenantChip = {
  key: TenantKey;
  /** Primary label */
  title: string;
  /** Monospace ALE chip text */
  aleDisplay: string;
  sector: string;
};

export const DEV_TENANT_CONTROL_CHIPS: DevTenantChip[] = [
  { key: "medshield", title: "Medshield", aleDisplay: "$11.1M", sector: "Healthcare" },
  { key: "vaultbank", title: "Vaultbank", aleDisplay: "$5.9M", sector: "Finance" },
  { key: "gridcore", title: "Gridcore", aleDisplay: "$4.7M", sector: "Infrastructure" },
  { key: "defense", title: "Defense", aleDisplay: "$16.0M", sector: "CMMC L3" },
];

/** Constitutional industry ALE anchors (USD integer cents) — paired with chip labels; aligns with docs/TAS.md §4. */
export const TENANT_INDUSTRY_BASELINE_ALE_CENTS: Record<TenantKey, bigint> = {
  medshield: 1_110_000_000n,
  vaultbank: 590_000_000n,
  gridcore: 470_000_000n,
  defense: 1_600_000_000n,
};

export function devTenantHandshakeAle(key: TenantKey | null): string {
  if (!key) return "$—";
  const row = DEV_TENANT_CONTROL_CHIPS.find((c) => c.key === key);
  return row?.aleDisplay ?? "$—";
}

export function devTenantHandshakeLabel(key: TenantKey | null): string {
  if (!key) return "GLOBAL";
  const row = DEV_TENANT_CONTROL_CHIPS.find((c) => c.key === key);
  return row?.title ?? key.toUpperCase();
}
