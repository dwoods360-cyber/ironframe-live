import { getSystemConfigSnapshot } from "@/app/store/systemConfigStore";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";
import { getIronguardEffectiveTenant } from "@/app/utils/ironguardSession";
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
 * Path/cookie tenant first (Ironguard session), then legacy UI label hints.
 * Shadow-plane / simulation mode may use Medshield when Global Command Center has no cookie
 * (matches server {@link getRedTeamSimulationTenantUuid} + Ironguard fetch bypass).
 */
export function resolveEffectiveTenantUuidForActions(
  activeTenantUuidFromContext: string | null,
  selectedTenantName: string | null,
): string | null {
  const fromPathOrCookie = resolveDashboardTenantUuid(activeTenantUuidFromContext);
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

  /** Global Command Center aggregate lane — bind constitutional default when cookie/Ironguard lag after client nav. */
  return TENANT_UUIDS.medshield;
}
