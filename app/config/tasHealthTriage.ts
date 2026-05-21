/** TAS §4.3 — health bar below this threshold triggers Irontech (Agent 12) structural freeze + triage. */
export const TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT = 50;

/** Incident zones for autonomous self-healing (Epic 13 consolidated engine). */
export type TriageIncidentZone =
  | "TELEMETRY_DROP"
  | "RED_TEAM_BREACH"
  | "LEDGER_DRIFT"
  | "INFRASTRUCTURE_FAULT";

export const TRIAGE_INCIDENT_ZONES: readonly TriageIncidentZone[] = [
  "TELEMETRY_DROP",
  "RED_TEAM_BREACH",
  "LEDGER_DRIFT",
  "INFRASTRUCTURE_FAULT",
] as const;

export function healthBarRequiresTriage(healthBarPercent: number): boolean {
  if (!Number.isFinite(healthBarPercent)) return false;
  return healthBarPercent < TAS_HEALTH_TRIAGE_THRESHOLD_PERCENT;
}

export function normalizeTriageIncidentZone(
  raw: string | undefined | null,
): TriageIncidentZone {
  const u = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (TRIAGE_INCIDENT_ZONES.includes(u as TriageIncidentZone)) {
    return u as TriageIncidentZone;
  }
  if (u.includes("TELEMETRY")) return "TELEMETRY_DROP";
  if (u.includes("RED") || u.includes("BREACH")) return "RED_TEAM_BREACH";
  if (u.includes("LEDGER") || u.includes("DRIFT")) return "LEDGER_DRIFT";
  return "INFRASTRUCTURE_FAULT";
}
