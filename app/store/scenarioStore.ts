"use client";

import { create } from "zustand";

export type ScenarioPreset = "Supply Chain Collapse" | "Ransomware Surge" | "Regulatory Crackdown" | null;

/** Multipliers applied to baseline/liability for projected risk (by preset) */
export const SCENARIO_MULTIPLIERS: Record<NonNullable<ScenarioPreset>, number> = {
  "Supply Chain Collapse": 1.85,
  "Ransomware Surge": 2.2,
  "Regulatory Crackdown": 1.55,
};

type ScenarioState = {
  activeScenario: ScenarioPreset;
  setActiveScenario: (preset: ScenarioPreset) => void;
  /** Multiplier for current scenario (1 when none) */
  multiplier: number;
};

export const useScenarioStore = create<ScenarioState>((set) => ({
  activeScenario: null,
  multiplier: 1,
  setActiveScenario: (preset) =>
    set({
      activeScenario: preset,
      multiplier: preset ? SCENARIO_MULTIPLIERS[preset] : 1,
    }),
}));
