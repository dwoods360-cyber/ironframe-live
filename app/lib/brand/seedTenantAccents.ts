export type TenantAccentTokens = {
  accentColor: string;
  accentClass: string;
  shortLabel?: string;
};

export const DEFAULT_TENANT_ACCENT: TenantAccentTokens = {
  accentColor: "#059669",
  accentClass: "text-emerald-600",
};

/** Seed-tenant accent overrides; dynamic tenants fall back to slug label + default accent. */
export const SEED_TENANT_ACCENTS: Record<string, TenantAccentTokens> = {
  medshield: { accentColor: "#3b82f6", accentClass: "text-blue-500", shortLabel: "MEDSHIELD" },
  vaultbank: { accentColor: "#10b981", accentClass: "text-emerald-500", shortLabel: "VAULTBANK" },
  gridcore: { accentColor: "#f59e0b", accentClass: "text-amber-500", shortLabel: "GRIDCORE" },
  defense: { accentColor: "#f43f5e", accentClass: "text-rose-500", shortLabel: "DEFENSE" },
};
