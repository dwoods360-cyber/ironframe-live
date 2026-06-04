import {
  IRONTECH_CHAOS_L6_AGENT_LINES,
  IRONTECH_CHAOS_L6_LIFECYCLE_MS,
} from "@/app/config/irontechChaosDrillOptions";
import { appendAuditLog } from "@/app/utils/auditLogger";
import { useAgentStore } from "@/app/store/agentStore";
import { useRiskStore } from "@/app/store/riskStore";

const L6_LINE_INTERVAL_MS = Math.floor(
  IRONTECH_CHAOS_L6_LIFECYCLE_MS / IRONTECH_CHAOS_L6_AGENT_LINES.length,
);

function agentSourceFromLine(line: string): string {
  const match = /^\[([^\]]+)\]/.exec(line.trim());
  return match?.[1]?.trim().toUpperCase().replace(/\s+/g, "_") ?? "IRONCAST";
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Client-only L6 mock — simulation telemetry; no tenant data mutation. */
export async function runIrontechChaosL6MockDrill(): Promise<void> {
  const setContextSwitching = useRiskStore.getState().setContextSwitching;

  setContextSwitching(true);
  window.dispatchEvent(
    new CustomEvent("ironframe:chaos-l6-freeze", { detail: { active: true } }),
  );

  appendAuditLog({
    action_type: "RED_TEAM_SIMULATION_START",
    log_type: "SIMULATION",
    description: "IRONTECH_CHAOS_L6 · Cryptographic ransomware extortion drill armed.",
    metadata_tag: "SIMULATION|IRONTECH_CHAOS_L6|ARMED",
  });

  for (const line of IRONTECH_CHAOS_L6_AGENT_LINES) {
    useAgentStore.getState().appendRiskIngestionTerminalLine(line);
    appendAuditLog({
      action_type: "RED_TEAM_SIMULATION_START",
      log_type: "SIMULATION",
      description: line,
      metadata_tag: `SIMULATION|IRONTECH_CHAOS_L6|${agentSourceFromLine(line)}`,
      forensic: {
        sourceName: agentSourceFromLine(line),
        eventLevel: "blue_team",
        message: line,
      },
    });
    await waitMs(L6_LINE_INTERVAL_MS);
  }

  const remainingMs = IRONTECH_CHAOS_L6_LIFECYCLE_MS - L6_LINE_INTERVAL_MS * IRONTECH_CHAOS_L6_AGENT_LINES.length;
  if (remainingMs > 0) {
    await waitMs(remainingMs);
  }

  setContextSwitching(false);
  window.dispatchEvent(
    new CustomEvent("ironframe:chaos-l6-freeze", { detail: { active: false } }),
  );
  window.dispatchEvent(new CustomEvent("ironframe:ekg-force-complete"));
}
