"use client";

import { create } from "zustand";
import type { CoreWorkforceAgent } from "@/app/config/agents";

type GrcAgentMetaDrawerState = {
  isOpen: boolean;
  selectedAgent: CoreWorkforceAgent | null;
  openAgent: (agent: CoreWorkforceAgent) => void;
  close: () => void;
};

export const useGrcAgentMetaDrawerStore = create<GrcAgentMetaDrawerState>((set) => ({
  isOpen: false,
  selectedAgent: null,
  openAgent: (agent) => set({ isOpen: true, selectedAgent: agent }),
  close: () => set({ isOpen: false, selectedAgent: null }),
}));
