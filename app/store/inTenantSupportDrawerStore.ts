"use client";

import { create } from "zustand";

import type { InTenantSupportUrgency } from "@/app/types/inTenantSupportTelemetry";

type OpenOptions = {
  urgency?: InTenantSupportUrgency;
  surface?: string;
};

type InTenantSupportDrawerState = {
  isOpen: boolean;
  presetUrgency: InTenantSupportUrgency | null;
  presetSurface: string | null;
  open: (options?: OpenOptions) => void;
  close: () => void;
  toggle: () => void;
};

export const useInTenantSupportDrawerStore = create<InTenantSupportDrawerState>((set) => ({
  isOpen: false,
  presetUrgency: null,
  presetSurface: null,
  open: (options) =>
    set({
      isOpen: true,
      presetUrgency: options?.urgency ?? null,
      presetSurface: options?.surface ?? null,
    }),
  close: () =>
    set({
      isOpen: false,
      presetUrgency: null,
      presetSurface: null,
    }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
