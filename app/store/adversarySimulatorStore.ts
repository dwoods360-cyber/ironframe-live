"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AdversarySimulatorState = {
  infiltrActive: boolean;
  phishActive: boolean;
  setInfiltrActive: (v: boolean) => void;
  setPhishActive: (v: boolean) => void;
  reset: () => void;
};

export const useAdversarySimulatorStore = create<AdversarySimulatorState>()(
  persist(
    (set) => ({
      infiltrActive: false,
      phishActive: false,
      setInfiltrActive: (v) => set({ infiltrActive: v }),
      setPhishActive: (v) => set({ phishActive: v }),
      reset: () => set({ infiltrActive: false, phishActive: false }),
    }),
    {
      name: "ironframe-adversary-sim",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ infiltrActive: s.infiltrActive, phishActive: s.phishActive }),
    },
  ),
);
