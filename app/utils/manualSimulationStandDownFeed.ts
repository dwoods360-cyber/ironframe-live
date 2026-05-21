"use client";

import { useAgentStore } from "@/app/store/agentStore";

const STAND_DOWN_LINE_RE = /stand-down|SIMULATION_STAND_DOWN|Board purge stand-down/i;

export const MANUAL_SIMULATION_RESUME_MESSAGE =
  "> [SYSTEM] Manual Override: Resuming simulation for intentional test.";

/** Clears stand-down-related lines from the Live Agent Feed and records an intentional-test resume. */
export function applyManualSimulationStandDownResumeFeed(): void {
  useAgentStore.setState((s) => ({
    intelligenceStream: [
      MANUAL_SIMULATION_RESUME_MESSAGE,
      ...s.intelligenceStream.filter((line) => !STAND_DOWN_LINE_RE.test(line)),
    ].slice(0, 50),
  }));
}
