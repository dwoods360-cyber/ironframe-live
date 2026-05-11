import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { resolveDashboardTenantUuid } from "@/app/utils/clientTenantCookie";

/**
 * Path/cookie tenant first (Ironguard session), then legacy UI label hints.
 * No implicit default tenant — callers must handle `null`.
 */
export function resolveEffectiveTenantUuidForActions(
  activeTenantUuidFromContext: string | null,
  selectedTenantName: string | null,
): string | null {
  const fromPathOrCookie = resolveDashboardTenantUuid(activeTenantUuidFromContext);
  if (fromPathOrCookie) return fromPathOrCookie;
  const n = (selectedTenantName ?? "").trim().toLowerCase();
  if (!n) return null;
  if (n.includes("vaultbank")) return TENANT_UUIDS.vaultbank;
  if (n.includes("gridcore")) return TENANT_UUIDS.gridcore;
  if (n.includes("defense")) return TENANT_UUIDS.defense;
  if (n.includes("medshield")) return TENANT_UUIDS.medshield;
  return null;
}
