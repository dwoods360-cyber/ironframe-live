"use client";

import { create } from "zustand";
import {
  getAutomatedUpdatesEnabled,
  toggleAutomatedUpdates as toggleAutomatedUpdatesAction,
} from "@/app/actions/simulationConfigActions";
import { getEnabledNotificationEndpointCount } from "@/app/actions/notificationEndpointActions";

type SimulationConfigState = {
  automatedUpdatesEnabled: boolean;
  activeEndpointCount: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  refreshActiveEndpointCount: () => Promise<void>;
  toggleAutomatedUpdates: () => Promise<void>;
};

export const useSimulationConfigStore = create<SimulationConfigState>((set) => ({
  automatedUpdatesEnabled: false,
  activeEndpointCount: 0,
  hydrated: false,
  hydrate: async () => {
    const [enabled, count] = await Promise.all([
      getAutomatedUpdatesEnabled(),
      getEnabledNotificationEndpointCount(),
    ]);
    set({ automatedUpdatesEnabled: enabled, activeEndpointCount: count, hydrated: true });
  },
  refreshActiveEndpointCount: async () => {
    const count = await getEnabledNotificationEndpointCount();
    set({ activeEndpointCount: count });
  },
  toggleAutomatedUpdates: async () => {
    const res = await toggleAutomatedUpdatesAction();
    if (!res.ok) return;
    const [enabled, count] = await Promise.all([
      getAutomatedUpdatesEnabled(),
      getEnabledNotificationEndpointCount(),
    ]);
    set({
      automatedUpdatesEnabled: enabled,
      activeEndpointCount: count,
      hydrated: true,
    });
  },
}));
