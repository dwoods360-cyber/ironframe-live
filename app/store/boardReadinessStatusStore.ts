"use client";

import { create } from "zustand";

export type BoardReadinessStatusState = "OK" | "BREACHED" | "UNKNOWN";

type BoardReadinessStatusSlice = {
  statusState: BoardReadinessStatusState;
  targetReadinessScore: number | null;
  currentReadinessScore: number | null;
  setFromBoardReport: (current: number, target: number) => void;
  reset: () => void;
};

/**
 * Global readiness vs target (Board Report). Other chrome may subscribe for breach banners later.
 */
export const useBoardReadinessStatusStore = create<BoardReadinessStatusSlice>((set) => ({
  statusState: "UNKNOWN",
  targetReadinessScore: null,
  currentReadinessScore: null,
  setFromBoardReport: (current, target) =>
    set({
      currentReadinessScore: current,
      targetReadinessScore: target,
      statusState: current < target ? "BREACHED" : "OK",
    }),
  reset: () =>
    set({
      statusState: "UNKNOWN",
      targetReadinessScore: null,
      currentReadinessScore: null,
    }),
}));
