import "server-only";

import {
  runIronscribeStaleDataOutagePostMortem,
  type StaleDataOutagePostMortemInput,
} from "@/app/services/ironscribe/staleDataOutagePostMortem";

/**
 * Resolution hooks after validated emergency ceremonies.
 * Today: tripartite **stale-data waiver** (Irontech freeze cleared) → Ironscribe post-mortem draft.
 */
export type EmergencyOverrideResolution =
  | { kind: "STALE_DATA_TRIPARTITE_WAIVER"; postMortem: StaleDataOutagePostMortemInput }
  | { kind: "NOOP" };

/**
 * Named per SRE brief (“executeEmergencyOverride”): runs Ironscribe (Agent 5) when the third key
 * validates and the Irontech `isSystemFrozen` posture is cleared via stale-data waiver.
 */
export async function executeEmergencyOverride(resolution: EmergencyOverrideResolution): Promise<void> {
  if (resolution.kind === "NOOP") return;
  if (resolution.kind === "STALE_DATA_TRIPARTITE_WAIVER") {
    await runIronscribeStaleDataOutagePostMortem(resolution.postMortem);
  }
}
