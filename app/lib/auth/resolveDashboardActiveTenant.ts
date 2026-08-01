import "server-only";

import { cache } from "react";
import { resolveDashboardAccess, ensureDashboardTenantSession } from "@/app/lib/auth/dashboardRoleAccess";
import { isProductionDemoBeachheadFilterActive } from "@/app/lib/demoBeachheadTenantGate";
import {
  getScopedTenantUuidFromCookies,
  isValidTenantUuid,
} from "@/app/utils/serverTenantContext";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/**
 * Cached per-request tenant UUID for dashboard server components.
 * Uses cookie scope when present; otherwise first RBAC assignment (with cookie hydration).
 * Production never silently falls back to the medshield demo beachhead.
 */
export const resolveDashboardActiveTenantUuid = cache(async (): Promise<string> => {
  const scoped = await getScopedTenantUuidFromCookies();
  if (scoped && isValidTenantUuid(scoped)) {
    return scoped.trim();
  }

  const access = await ensureDashboardTenantSession(await resolveDashboardAccess());
  if (access.status === "allowed") {
    return access.tenantUuid;
  }

  if (isProductionDemoBeachheadFilterActive()) {
    return "";
  }

  return TENANT_UUIDS.medshield;
});
