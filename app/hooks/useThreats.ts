"use client";

import { useRiskStore } from "@/app/store/riskStore";

/**
 * Active-board refresh — delegates to {@link useRiskStore.getState().refreshActiveThreatsFromDb} /
 * {@link useRiskStore.getState().pulseThreatBoardsFromDb} from Chaos handlers.
 * Concurrent calls cooperatively abort the previous `GET /api/threats/active` (`activeThreatsBoardFetchCoop`);
 * server may respond with HTTP 499 on client disconnect — not an application error.
 */
export function useRefreshActiveThreatsFromDb() {
  return useRiskStore((s) => s.refreshActiveThreatsFromDb);
}
