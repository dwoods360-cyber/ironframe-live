"use client";

import { useEffect, useRef } from "react";
import { isShadowPlaneUiActive } from "@/app/utils/shadowPlaneActive";

/**
 * When Shadow Plane / simulation goes live, immediately reload pipeline + active boards + dashboard payload
 * for `dashboardTenantUuid` (no `useThreatStore` in this codebase — wires into `useRiskStore` pulse paths).
 */
export function useShadowPlaneThreatRefetch(args: {
  dashboardTenantUuid: string | null;
  isSimulationMode: boolean;
  pulseThreatBoardsFromDb: () => Promise<void>;
  refetchDashboard: () => void;
}): void {
  const prevLiveRef = useRef(false);

  useEffect(() => {
    const live = args.isSimulationMode || isShadowPlaneUiActive();
    const tenant = args.dashboardTenantUuid?.trim();
    if (!tenant) {
      prevLiveRef.current = live;
      return;
    }
    if (live && !prevLiveRef.current) {
      void args.pulseThreatBoardsFromDb().catch(() => undefined);
      args.refetchDashboard();
    }
    prevLiveRef.current = live;
  }, [
    args.dashboardTenantUuid,
    args.isSimulationMode,
    args.pulseThreatBoardsFromDb,
    args.refetchDashboard,
  ]);
}
