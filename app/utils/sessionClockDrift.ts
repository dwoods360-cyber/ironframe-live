/**
 * GRC session clock skew vs server RSC time — measured once per ClockDriftBanner mount.
 * Appended to Audit Intelligence `metadata_tag` and forensic JSON exports.
 */
let sessionClockDriftMs: number | null = null;

export function setSessionClockDriftMs(ms: number | null): void {
  sessionClockDriftMs = ms == null || Number.isNaN(ms) ? null : Math.round(ms);
}

export function getSessionClockDriftMs(): number | null {
  return sessionClockDriftMs;
}

/** Suffix fragment for `metadata_tag` (pipe-delimited GRC tags). */
export function clockDriftMetadataFragment(): string | null {
  const d = sessionClockDriftMs;
  if (d == null) return null;
  return `grc:clock_drift_ms=${d}`;
}

export function appendClockDriftToMetadataTag(metadataTag: string | null | undefined): string | null {
  const frag = clockDriftMetadataFragment();
  if (frag == null) return metadataTag?.trim() || null;
  const base = (metadataTag ?? "").trim();
  if (!base) return frag;
  if (base.includes("grc:clock_drift_ms=")) return base;
  return `${base}|${frag}`;
}
