import { create } from "zustand";
import { generateSimulatedCompanies, runGrcBotCycle, type GrcBotCycleOptions } from "@/app/utils/grcBotEngine";
import type { SerializedCompany } from "@/app/components/GlobalHealthSummaryCardClient";
import { useRiskStore } from "@/app/store/riskStore";

const GRCBOT_INTERVAL_MS = 12_000;
const DEFAULT_COMPANY_COUNT = 50;
const FAIL_SLA_PROBABILITY = 0.15;

type GrcBotState = {
  enabled: boolean;
  companyCount: number;
  simulatedCompanies: SerializedCompany[];
  setEnabled: (enabled: boolean) => void;
  setCompanyCount: (count: number) => void;
  setSimulatedCompanies: (companies: SerializedCompany[]) => void;
  start: () => void;
  stop: () => void;
};

let intervalId: ReturnType<typeof setInterval> | null = null;

export const useGrcBotStore = create<GrcBotState>((set, get) => ({
  enabled: false,
  companyCount: DEFAULT_COMPANY_COUNT,
  simulatedCompanies: [],

  setEnabled: (enabled) => {
    if (enabled) get().start();
    else get().stop();
    set({ enabled });
  },

  setCompanyCount: (count) => {
    const clamped = Math.min(100, Math.max(1, count));
    set({ companyCount: clamped });
    if (get().enabled) {
      set({
        simulatedCompanies: generateSimulatedCompanies(clamped),
      });
    }
  },

  setSimulatedCompanies: (companies) => set({ simulatedCompanies: companies }),

  start: () => {
    if (intervalId != null) return;
    const { companyCount } = get();
    set({
      simulatedCompanies: generateSimulatedCompanies(companyCount),
    });
    const kick = () => {
      const state = get();
      void (async () => {
        await runGrcBotCycle({
          companyCount: state.companyCount,
          failSlaProbability: FAIL_SLA_PROBABILITY,
        } as GrcBotCycleOptions);
        await useRiskStore.getState().pulseThreatBoardsFromDb();
      })();
      set({
        simulatedCompanies: generateSimulatedCompanies(state.companyCount),
      });
    };
    kick();
    intervalId = setInterval(kick, GRCBOT_INTERVAL_MS);
  },

  stop: () => {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    set({ simulatedCompanies: [] });
  },
}));
