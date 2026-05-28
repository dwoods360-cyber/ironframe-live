"use client";

import { useEffect, useRef } from "react";
import { isShadowPlaneUiActive } from "@/app/utils/shadowPlaneActive";

/**
 * When Shadow Plane / simulation goes live, immediately reload pipeline + active boards + dashboard payload
 * for `dashboardTenantUuid` (no `useThreatStore` in this codebase — wires into `useRiskStore` pulse paths).
 */
export function useShadowPlaneThreatRefetch({
  dashboardTenantUuid,
  isSimulationMode,
  pulseThreatBoardsFromDb,
  refetchDashboard,
}: {
  dashboardTenantUuid: string | null;
  isSimulationMode: boolean;
  pulseThreatBoardsFromDb: () => Promise<void>;
  refetchDashboard: () => void;
}): void {
  const prevLiveRef = useRef(false);

  useEffect(() => {
    const live = isSimulationMode || isShadowPlaneUiActive();
    const tenant = dashboardTenantUuid?.trim();
    if (!tenant) {
      prevLiveRef.current = live;
      return;
    }
    if (live && !prevLiveRef.current) {
      void pulseThreatBoardsFromDb().catch(() => undefined);
      refetchDashboard();
    }
    prevLiveRef.current = live;
  }, [dashboardTenantUuid, isSimulationMode, pulseThreatBoardsFromDb, refetchDashboard]);
}
