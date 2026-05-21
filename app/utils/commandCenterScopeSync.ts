import type { CommandCenterTenantRow } from "@/app/actions/tenantActions";
import { tenantIndustryCodeToProfileLabel } from "@/app/utils/tenantIndustryProfile";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { setIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
import { SIMULATION_MODE_COOKIE } from "@/app/constants/simulationCookie";
import { isShadowPlaneUiActive } from "@/app/utils/shadowPlaneActive";

export function readIronframeTenantCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const v = document.cookie
    .split("; ")
    .find((row) => row.startsWith("ironframe-tenant="))
    ?.split("=")[1]
    ?.trim();
  return v || undefined;
}

export function resolveCommandCenterTenantRow(
  rows: CommandCenterTenantRow[],
  raw: string | undefined,
): CommandCenterTenantRow | undefined {
  if (!raw?.trim()) return undefined;
  const lower = raw.trim().toLowerCase();
  return (
    rows.find((r) => r.id.toLowerCase() === lower) ?? rows.find((r) => r.slug.toLowerCase() === lower)
  );
}

/**
 * Align header tenant label + Strategic Intel Industry Profile with `ironframe-tenant` cookie.
 * Global aggregate (no cookie): tenant name cleared; industry left unchanged (sector lens for aggregate).
 */
/** Global aggregate + shadow/simulation: align Ironguard with server red-team tenant (e79ea77 parity). */
export function syncIronguardForRedTeamLane(cookieAbsent: boolean): void {
  if (!cookieAbsent || typeof window === "undefined") return;
  const shadow =
    isShadowPlaneUiActive() ||
    process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "true" ||
    process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE === "1";
  const simulation = document.cookie
    .split("; ")
    .some((row) => row.startsWith(`${SIMULATION_MODE_COOKIE}=`) && row.split("=")[1]?.trim() === "1");
  if (shadow || simulation) {
    setIronguardEffectiveTenant(TENANT_UUIDS.medshield);
  } else {
    setIronguardEffectiveTenant(null);
  }
}

export function applyCommandCenterScopeFromCookie(
  rows: CommandCenterTenantRow[],
  setters: {
    setSelectedTenantName: (name: string | null) => void;
    setSelectedIndustry: (industry: string) => void;
  },
): void {
  const raw = readIronframeTenantCookie();
  if (!raw) {
    setters.setSelectedTenantName(null);
    syncIronguardForRedTeamLane(true);
    return;
  }
  syncIronguardForRedTeamLane(false);
  const tenant = resolveCommandCenterTenantRow(rows, raw);
  setters.setSelectedTenantName(tenant?.name?.trim() ? tenant.name.trim() : null);
  if (tenant) {
    setters.setSelectedIndustry(tenantIndustryCodeToProfileLabel(tenant.industry));
  }
}
