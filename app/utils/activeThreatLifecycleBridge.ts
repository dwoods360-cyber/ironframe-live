/** Active Risks: RESOLVED row linger before board purge (matches `ActiveRisksClient` conductor). */
export const ACTIVE_THREAT_VICTORY_LAP_MS = 4000;

/**
 * Bridges manual neutralize (ThreatCard) → ActiveRisksClient lifecycle registry (stateless holder conductor).
 */
export type ArmVictoryLapOptions = {  /** ≥50 chars: braided into Audit Intelligence as Human Concurrence on victory arm. */
  humanConcurrenceText?: string;
};

type ArmVictoryFn = (threatId: string, options?: ArmVictoryLapOptions) => void;

let armVictoryLap: ArmVictoryFn | null = null;

export function registerActiveThreatVictoryLapHandler(fn: ArmVictoryFn | null): void {
  armVictoryLap = fn;
}

/** Call after neutralize API 200 so the parent registry runs the 4s victory lap + purge. */
export function requestVictoryLapFromNeutralize(
  threatId: string,
  options?: ArmVictoryLapOptions,
): void {
  const id = threatId.trim();
  if (!id) return;
  armVictoryLap?.(id, options);
}
