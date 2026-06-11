/**
 * GRC clock skew — client `Date.now()` vs server RSC request-time baseline.
 * Tolerance accounts for cloud container / edge latency (not strict NTP parity).
 */
export const CLOCK_DRIFT_WARN_THRESHOLD_MS = 2000;

export const CLOCK_DRIFT_DISMISS_SESSION_KEY = "ironframe:clock-drift-operator-dismiss";

export function readClockDriftDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CLOCK_DRIFT_DISMISS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Operator bypass after manual NTP verification — session-scoped only. */
export function dismissClockDriftWarning(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CLOCK_DRIFT_DISMISS_SESSION_KEY, "1");
  } catch {
    /* non-fatal */
  }
}
