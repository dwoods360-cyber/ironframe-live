import { getSystemConfigSnapshot } from "@/app/store/systemConfigStore";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import {
  getDashboardWorkspaceFallbackTenant,
  getIronguardEffectiveTenant,
} from "@/app/utils/ironguardSession";
import { isShadowPlaneUiActive } from "@/app/utils/shadowPlaneActive";

function shadowPlaneAllowsSimulationTenantFallback(): boolean {
  if (typeof window === "undefined") return false;
  if (isShadowPlaneUiActive()) return true;
  const pub = process.env.NEXT_PUBLIC_SHADOW_PLANE_ACTIVE;
  return pub === "true" || pub === "1";
}

function simulationModeClientActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return getSystemConfigSnapshot().isSimulationMode === true;
  } catch {
    return false;
  }
}

/**
 * Tenant UUID for server actions (assignee, acknowledge, resolve).
 * Host-bound / TenantProvider context must win over a stale `ironframe-tenant` cookie
 * (see c22d978c + DashboardGroupShell realignment for subdomain workspaces like run4c).
 */
export function resolveEffectiveTenantUuidForActions(
  activeTenantUuidFromContext: string | null,
  selectedTenantName: string | null,
): string | null {
  const fromContext = activeTenantUuidFromContext?.trim();
  if (fromContext) return fromContext.toLowerCase();

  const fromDashboardFallback = getDashboardWorkspaceFallbackTenant();
  if (fromDashboardFallback) return fromDashboardFallback;

  const fromPathOrCookie = resolveDashboardTenantUuid(null);
  if (fromPathOrCookie) return fromPathOrCookie;

  const fromIronguard = getIronguardEffectiveTenant();
  if (fromIronguard) return fromIronguard;

  const n = (selectedTenantName ?? "").trim().toLowerCase();
  if (n.includes("vaultbank")) return TENANT_UUIDS.vaultbank;
  if (n.includes("gridcore")) return TENANT_UUIDS.gridcore;
  if (n.includes("defense")) return TENANT_UUIDS.defense;
  if (n.includes("medshield")) return TENANT_UUIDS.medshield;

  if (shadowPlaneAllowsSimulationTenantFallback() || simulationModeClientActive()) {
    return TENANT_UUIDS.medshield;
  }

  return null;
}
