"use client";

import { create } from "zustand";

type SimulationState = {
  isSimulationActive: boolean;
  activeDrillId: string | null;
  startSimulation: (drillId?: string) => void;
  endSimulation: () => void;
};

export const useSimulationStore = create<SimulationState>((set) => ({
  isSimulationActive: false,
  activeDrillId: null,
  startSimulation: (drillId) =>
    set({
      isSimulationActive: true,
      activeDrillId: drillId ?? crypto.randomUUID(),
    }),
  endSimulation: () =>
    set({
      isSimulationActive: false,
      activeDrillId: null,
    }),
}));
