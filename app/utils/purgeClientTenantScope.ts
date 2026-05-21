"use client";

import { syncShadowSimulatorArmAction } from "@/app/actions/shadowSimulatorArmActions";
import { useAdversarySimulatorStore } from "@/app/store/adversarySimulatorStore";
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
 * Command Center / tenant transitions — hard flush before new scope binds, then immediately
 * re-hydrate InfilBot / PhishBot armed flags from the server (shadow arm snapshot).
 */
export async function purgeClientTenantScopeAfterSwitch(): Promise<void> {
  resetAllStores();
  tenantScopeCache.clear();
  try {
    const snap = await syncShadowSimulatorArmAction();
    useAdversarySimulatorStore.getState().setInfiltrActive(snap.infiltrBotSimActive);
    useAdversarySimulatorStore.getState().setPhishActive(snap.phishBotSimActive);
  } catch {
    /* non-fatal — keep cleared simulator state */
  }
}
