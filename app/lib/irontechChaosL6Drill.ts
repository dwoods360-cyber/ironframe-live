import {
  IRONTECH_CHAOS_L6_AGENT_LINES,
  IRONTECH_CHAOS_L6_LIFECYCLE_MS,
} from "@/app/config/irontechChaosDrillOptions";
import { appendAuditLog, type AuditActionType } from "@/app/utils/auditLogger";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";

const L6_LINE_INTERVAL_MS = Math.floor(
  IRONTECH_CHAOS_L6_LIFECYCLE_MS / IRONTECH_CHAOS_L6_AGENT_LINES.length,
);

function agentSourceFromLine(line: string): string {
  const match = /^\[([^\]]+)\]/.exec(line.trim());
  return match?.[1]?.trim().toUpperCase().replace(/\s+/g, "_") ?? "IRONCAST";
}

function actionDetailFromLine(line: string): string {
  const trimmed = line.trim();
  const bracketEnd = trimmed.indexOf("]");
  if (bracketEnd < 0) return trimmed;
  const afterFirst = trimmed.slice(bracketEnd + 1).trim();
  const secondBracket = afterFirst.indexOf("]");
  if (secondBracket >= 0) {
    return afterFirst.slice(secondBracket + 1).trim() || trimmed;
  }
  return afterFirst || trimmed;
}

function mapL6LineToAuditAction(line: string): {
  action_type: AuditActionType;
  actorGate: string;
} {
  const u = line.toUpperCase();
  if (u.includes("[IRONGATE]")) {
    return { action_type: "SECURITY_THREAT_INTERCEPTED", actorGate: "IRONGATE_GATEWAY" };
  }
  if (u.includes("[IRONLOCK]")) {
    return { action_type: "INTERRUPT_CONTAINMENT_DEPLOYED", actorGate: "IRONLOCK_AUTHORITY" };
  }
  return { action_type: "CHAOS_AGENT_TELEMETRY", actorGate: agentSourceFromLine(line) };
}

function appendL6AgentAuditLine(line: string): void {
  const { action_type, actorGate } = mapL6LineToAuditAction(line);
  const agentTag = agentSourceFromLine(line);
  const detail = actionDetailFromLine(line);
  const ironscribeMessage = [
    `${action_type} — ${line.trim()}`,
    `Action: ${detail}`,
    `Actor: ${actorGate}`,
  ].join(" | ");

  appendAuditLog({
    action_type,
    log_type: "GRC",
    description: line,
    metadata_tag: `IRONTECH_CHAOS_L6|${agentTag}|${action_type}`,
    forensic: {
      sourceName: actorGate,
      eventLevel: "blue_team",
      message: ironscribeMessage,
      statusIcon: "●",
    },
  });
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Client-only L6 mock — simulation telemetry; no tenant data mutation. */
export async function runIrontechChaosL6MockDrill(): Promise<void> {
  const setContextSwitching = useRiskStore.getState().setContextSwitching;

  useAgentStore.getState().clearRiskIngestionTerminalLines();

  setContextSwitching(true);
  window.dispatchEvent(
    new CustomEvent("ironframe:chaos-l6-freeze", { detail: { active: true } }),
  );

  appendAuditLog({
    action_type: "RED_TEAM_SIMULATION_START",
    log_type: "GRC",
    description:
      "IRONTECH_CHAOS_L6 · Cryptographic ransomware extortion drill armed.",
    metadata_tag: "IRONTECH_CHAOS_L6|ARMED",
    forensic: {
      sourceName: "IRONTECH_CHAOS",
      eventLevel: "red_team",
      message:
        "RED_TEAM_SIMULATION_START — IRONTECH CHAOS L6 · CRYPTOGRAPHIC RANSOMWARE (EXTORTION) | Action: Level 6 drill sequence armed | Actor: IRONTECH_CHAOS",
      statusIcon: "⚠",
    },
  });

  for (const line of IRONTECH_CHAOS_L6_AGENT_LINES) {
    appendL6AgentAuditLine(line);
    await waitMs(L6_LINE_INTERVAL_MS);
  }

  const remainingMs =
    IRONTECH_CHAOS_L6_LIFECYCLE_MS - L6_LINE_INTERVAL_MS * IRONTECH_CHAOS_L6_AGENT_LINES.length;
  if (remainingMs > 0) {
    await waitMs(remainingMs);
  }

  setContextSwitching(false);
  window.dispatchEvent(
    new CustomEvent("ironframe:chaos-l6-freeze", { detail: { active: false } }),
  );
  window.dispatchEvent(new CustomEvent("ironframe:ekg-force-complete"));
}
