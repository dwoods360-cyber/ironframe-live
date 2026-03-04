"use client";

import { create } from "zustand";
import type { KimbotAttackType, KimbotRawSignal } from "@/app/utils/kimbotEngine";

type KimbotState = {
  enabled: boolean;
  intensity: number;
  attackType: KimbotAttackType;
  injectedSignals: KimbotRawSignal[];
  /** Cumulative count of raw signals generated (for compute billing) */
  totalSignalsGenerated: number;
  setEnabled: (enabled: boolean) => void;
  setIntensity: (intensity: number) => void;
  setAttackType: (attackType: KimbotAttackType) => void;
  addInjectedSignal: (signal: KimbotRawSignal) => void;
  removeInjectedSignal: (id: string) => void;
  /** Reset simulation counters (for Purge Simulation Data) */
  resetSimulationCounters: () => void;
};

export const useKimbotStore = create<KimbotState>((set) => ({
  enabled: false,
  intensity: 5,
  attackType: "Ransomware",
  injectedSignals: [],
  totalSignalsGenerated: 0,
  setEnabled: (enabled) => set({ enabled }),
  setIntensity: (intensity) => set({ intensity: Math.max(1, Math.min(10, intensity)) }),
  setAttackType: (attackType) => set({ attackType }),
  addInjectedSignal: (signal) =>
    set((state) => ({
      injectedSignals: [...state.injectedSignals, signal],
      totalSignalsGenerated: state.totalSignalsGenerated + 1,
    })),
  removeInjectedSignal: (id) =>
    set((state) => ({
      injectedSignals: state.injectedSignals.filter((s) => s.id !== id),
    })),
  resetSimulationCounters: () =>
    set({ injectedSignals: [], totalSignalsGenerated: 0 }),
}));
