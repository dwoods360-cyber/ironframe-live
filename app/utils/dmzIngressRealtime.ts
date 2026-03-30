/**
 * Sprint 6.13: shared DMZ / IRONWAVE terminal lines + IRONLOCK audio helpers.
 * Single source for Realtime-driven ingress (replaces polling in useIronwaveDMZTelemetry).
 */

/** Same text previously appended by DMZ pipeline polling for standard payloads. */
export const DMZ_STANDARD_TELEMETRY_LINE =
  "[IRONWAVE] Standard telemetry payload arrived in DMZ Quarantine.";

export const DMZ_IRONLOCK_CRITICAL_LINE =
  "[IRONLOCK INTERRUPT] 🚨 CRITICAL PAYLOAD IN DMZ. APP CORRUPTION RISK DETECTED.";

export const IRONTECH_ESCALATION_TERMINAL_LINE =
  "> [IRONTECH] ⚠️ Escalation detected. Manual Intervention Required.";

/** Matches `recordResilienceIntelStreamLine` in chaosActions (Intelligence Stream). */
export const IRONCHAOS_INTEL_STREAM_LINE =
  "> [IRONCHAOS] ⚡ Poisoned Threat Ingress detected. Monitoring Irontech response...";

/** Control Room: synchronous feedback on Generate Chaos Threat click (before server returns). */
export const IRONCHAOS_INGRESS_INITIATED_LINE =
  "> [IRONCHAOS] ⚡ Ingress Initiated. Deploying poisoned payload...";

/** Manual recovery (Attempt 4) — pushed immediately on Double-Check / Save click. */
export const RECOVERY_ATTEMPT4_TERMINAL_LINE =
  "> [SYSTEM] User authorization received. Handing off to Irontech for Attempt 4...";

/** Double-Check (Attempt 4) — logged synchronously before server action (Sprint 6.16). */
export const MANUAL_FIX_ATTEMPT4_TERMINAL_LINE =
  "> [SYSTEM] Manual fix authorized. Irontech is initializing Attempt 4...";

function parseIngestionPayload(ingestionDetails: string | null): {
  severity?: string;
  vector?: string;
} {
  if (ingestionDetails == null || ingestionDetails.trim() === "") return {};
  try {
    const o = JSON.parse(ingestionDetails) as Record<string, unknown>;
    const severity = typeof o.severity === "string" ? o.severity : undefined;
    const vector = typeof o.vector === "string" ? o.vector : undefined;
    return { severity, vector };
  } catch {
    return {};
  }
}

/** App-corruption / IRONLOCK tier: CRITICAL / SQL_INJECTION / RCE in ingestion JSON. */
export function dmzPayloadMeetsIronlockAudioThreshold(ingestionDetails: string | null): boolean {
  const { severity, vector } = parseIngestionPayload(ingestionDetails);
  if (severity?.toUpperCase() === "CRITICAL") return true;
  const v = vector?.toUpperCase();
  return v === "SQL_INJECTION" || v === "RCE";
}

export function playIronlockAlarm(): void {
  try {
    const audio = new Audio("/notification_message-notification-alert-7-331719.mp3");
    audio.volume = 0.8;
    void audio.play().catch(() => {
      console.warn("Audio autoplay blocked by browser");
    });
  } catch {
    console.warn("Audio autoplay blocked by browser");
  }
}

function readIngestionDetails(row: Record<string, unknown>): string | null {
  const v = row.ingestionDetails ?? row.ingestion_details;
  if (v === null || v === undefined) return null;
  return typeof v === "string" ? v : null;
}

export function terminalLineForThreatInsert(row: Record<string, unknown>): string {
  const ingestion = readIngestionDetails(row);
  return dmzPayloadMeetsIronlockAudioThreshold(ingestion)
    ? DMZ_IRONLOCK_CRITICAL_LINE
    : DMZ_STANDARD_TELEMETRY_LINE;
}

export function maybePlayIronlockForThreatRow(row: Record<string, unknown>): void {
  if (dmzPayloadMeetsIronlockAudioThreshold(readIngestionDetails(row))) {
    playIronlockAlarm();
  }
}
