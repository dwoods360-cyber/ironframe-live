"use client";

import { resetAllStores } from "@/app/store/resetAllStores";
import { tenantScopeCache } from "@/app/utils/apiCacheCoordinator";

/**
 * Full cold-boot: Zustand tenant scratch + client audit buffer + dashboard cache hints.
 * Matches TAS `resetAllStores()` + `tenantScopeCache.clear()` ordering.
 */
export function resetAllStoresAndTenantScopeCache(): void {
  resetAllStores();
  tenantScopeCache.clear();
}

/**
 * Command Center / tenant transitions — hard flush before new scope binds.
 */
export function purgeClientTenantScopeAfterSwitch(): void {
  resetAllStoresAndTenantScopeCache();
}
