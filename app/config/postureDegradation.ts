/** Board-level TRIPARTITE → DUAL downgrade workflow phases. */
export const POSTURE_DEGRADATION_PHASE_PENDING = "PENDING_DEGRADATION" as const;
export const POSTURE_DEGRADATION_PHASE_COOLDOWN = "COOLDOWN" as const;

export type PostureDegradationPhase =
  | typeof POSTURE_DEGRADATION_PHASE_PENDING
  | typeof POSTURE_DEGRADATION_PHASE_COOLDOWN;

export const GOVERNANCE_ALERT_ACTION = "GOVERNANCE_ALERT";
export const GOVERNANCE_ABORT_ACTION = "GOVERNANCE_DEGRADATION_ABORT";
export const POSTURE_DEGRADATION_COMPLETE_ACTION = "POSTURE_DEGRADATION_COMPLETE";

/** Default 24-hour cool-down after triple-executive attestation. */
export const POSTURE_DEGRADATION_COOLDOWN_MS_DEFAULT = 24 * 60 * 60 * 1000;

export function resolvePostureDegradationCooldownMs(): number {
  const hours = Number(process.env.POSTURE_DEGRADATION_COOLDOWN_HOURS);
  if (Number.isFinite(hours) && hours > 0) {
    return Math.floor(hours * 60 * 60 * 1000);
  }
  return POSTURE_DEGRADATION_COOLDOWN_MS_DEFAULT;
}

export function formatPostureDegradationCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function buildGovernanceAlertMessage(remainingMs: number): string {
  const countdown = formatPostureDegradationCountdown(remainingMs);
  return `[GOVERNANCE ALERT] Administrative Downgrade Pending. Posture will shift to DUAL_LOCK in ${countdown}. Authorized by CEO, CFO, CIO.`;
}
