import { appendAuditLog, type AuditActionType } from "@/app/utils/auditLogger";
import { signalAgentTelemetryFromText } from "@/app/utils/agentTelemetryPulseClient";

/** DMZ / chaos terminal scratch lines → Audit Intelligence forensic ledger (never Risk Ingestion UI). */
export function routeTerminalLineToForensicAudit(line: string): void {
  const trimmed = line.trim();
  if (!trimmed) return;

  const u = trimmed.toUpperCase();
  let action_type: AuditActionType = "CHAOS_AGENT_TELEMETRY";
  let sourceName = "IRONWAVE";

  if (/\[?IRONLOCK|IRONLOCK INTERRUPT/.test(u)) {
    action_type = "INTERRUPT_CONTAINMENT_DEPLOYED";
    sourceName = "IRONLOCK_AUTHORITY";
  } else if (/\[?IRONGATE|AGENT-14/.test(u)) {
    action_type = "SECURITY_THREAT_INTERCEPTED";
    sourceName = "IRONGATE_GATEWAY";
  } else if (/IRONCHAOS/.test(u)) {
    sourceName = "IRONCHAOS";
  } else if (/IRONTECH/.test(u)) {
    sourceName = "IRONTECH";
  } else if (/IRONSCRIBE/.test(u)) {
    sourceName = "IRONSCRIBE";
  } else if (/IRONTRUST/.test(u)) {
    sourceName = "IRONTRUST";
  } else if (/IRONCAST/.test(u)) {
    sourceName = "IRONCAST";
  }

  const eventLevel =
    u.includes("CRITICAL") || u.includes("INTERRUPT") || u.includes("POISONED")
      ? ("red_team" as const)
      : ("blue_team" as const);

  appendAuditLog({
    action_type,
    log_type: "GRC",
    description: trimmed,
    metadata_tag: `DMZ_INGRESS|${sourceName}|${action_type}`,
    forensic: {
      sourceName,
      eventLevel,
      message: `${action_type} — ${trimmed} | Actor: ${sourceName}`,
      statusIcon: eventLevel === "red_team" ? "⚠" : "●",
    },
  });

  signalAgentTelemetryFromText(`${trimmed} ${sourceName}`);
}
