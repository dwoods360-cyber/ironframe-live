/** Ironguard / Irontech — sustainability stale-data lockdown (Edge-safe constants + pure helpers). */

/** Red global banner headline (Irontech prolonged outage / state freeze). */
export const LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE = "LOCKDOWN: PROLONGED OUTAGE";

export const IRONTECH_STALE_LOCKDOWN_MESSAGE =
  "IRONTECH LOCKDOWN: Sustainability API outage has exceeded 24h safety threshold. State is frozen to prevent unverified drift. 3-Key Override required to resume.";

/** Hours degraded before Irontech (Agent 12) hard-blocks mutations (unless tripartite waiver). */
export const SUSTAINABILITY_STALE_LOCKDOWN_THRESHOLD_HOURS = 24;

export const SUSTAINABILITY_STALE_LOCKDOWN_MATURITY_PENALTY = 1.5;

export type SystemConfigStaleLockdownSlice = {
  sustainabilityLiveApiDegraded: boolean;
  sustainabilityApiDegradedSince: Date | null;
  sustainabilityStaleLockdownWaived: boolean;
  sustainabilityStaleLockdownWitnessAt?: Date | null;
};

export type SustainabilityStaleLockdownComputed = {
  blockingMutations: boolean;
  staleDataLockdownWindow: boolean;
  degradedSinceMs: number | null;
  hoursDegraded: number | null;
};

export function computeSustainabilityStaleLockdown(
  row: SystemConfigStaleLockdownSlice | null | undefined,
  nowMs: number = Date.now(),
): SustainabilityStaleLockdownComputed {
  if (!row?.sustainabilityLiveApiDegraded || !row.sustainabilityApiDegradedSince) {
    return {
      blockingMutations: false,
      staleDataLockdownWindow: false,
      degradedSinceMs: null,
      hoursDegraded: null,
    };
  }
  const degradedSince = row.sustainabilityApiDegradedSince;
  const since =
    degradedSince instanceof Date
      ? degradedSince.getTime()
      : typeof degradedSince === "string"
        ? Date.parse(degradedSince)
        : NaN;
  if (!Number.isFinite(since)) {
    return {
      blockingMutations: false,
      staleDataLockdownWindow: false,
      degradedSinceMs: null,
      hoursDegraded: null,
    };
  }
  const hours = (nowMs - since) / 3_600_000;
  const breached = hours >= SUSTAINABILITY_STALE_LOCKDOWN_THRESHOLD_HOURS;
  const blocking = breached && !row.sustainabilityStaleLockdownWaived;
  const staleDataLockdownWindow = breached;
  return {
    blockingMutations: blocking,
    staleDataLockdownWindow,
    degradedSinceMs: since,
    hoursDegraded: hours,
  };
}
