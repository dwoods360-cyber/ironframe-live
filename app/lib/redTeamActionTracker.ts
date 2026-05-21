import { appendAuditLog } from "@/app/utils/auditLogger";
import type { AttackRiskCardProcessedData } from "@/app/types/attackRiskCard";

export type RedTeamTrackerEvent = "REGISTERED" | "RESOLVED" | "FAILED";

function trackerMessage(
  event: RedTeamTrackerEvent,
  data: AttackRiskCardProcessedData,
  extra?: string,
): string {
  const base = `${data.agentId} · ${data.attackVector} → ${data.targetAsset}`;
  switch (event) {
    case "REGISTERED":
      return `Action Tracker · attack registered · ${base} · ${data.payloadDetails.slice(0, 240)}`;
    case "RESOLVED":
      return `Action Tracker · attack resolved · ${base}${extra ? ` · ${extra}` : ""}`;
    case "FAILED":
      return `Action Tracker · attack failed · ${base}${extra ? ` · ${extra}` : ""}`;
  }
}

/** Forensic feed line for Audit Intelligence (right rail) on every Red Team move. */
export function logRedTeamActionTracker(
  event: RedTeamTrackerEvent,
  data: AttackRiskCardProcessedData,
  extra?: string,
): void {
  appendAuditLog({
    action_type: "SYSTEM_WARNING",
    log_type: "SIMULATION",
    metadata_tag: `RED_TEAM_ACTION_TRACKER|${event}`,
    forensic: {
      sourceName: data.agentId.replace(/\s+/g, "_").toUpperCase().slice(0, 32) || "ACTOR:RED",
      eventLevel: "red_team",
      message: trackerMessage(event, data, extra),
      statusIcon: event === "FAILED" ? "✕" : event === "RESOLVED" ? "✓" : "⚠",
    },
  });
}
