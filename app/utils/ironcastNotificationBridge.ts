import type { AuditActionType, CreateAuditLogInput } from "@/app/utils/auditLogger";
import type { IroncastNotificationToast } from "@/app/store/ironcastNotificationStore";
import { useIroncastNotificationStore } from "@/app/store/ironcastNotificationStore";

const BLOCK_LEVEL_ACTIONS = new Set<AuditActionType>([
  "SECURITY_THREAT_INTERCEPTED",
  "INTERRUPT_CONTAINMENT_DEPLOYED",
]);

function bracketAgentDetail(line: string): { agent: string; detail: string } {
  const trimmed = line.trim();
  const first = /^\[([^\]]+)\]/.exec(trimmed);
  const agent = first?.[1]?.trim() || "Ironcast";
  let rest = first ? trimmed.slice(first[0].length).trim() : trimmed;
  const second = /^\[([^\]]+)\]/.exec(rest);
  if (second) rest = rest.slice(second[0].length).trim();
  return { agent, detail: rest || trimmed };
}

function haystackFromAudit(input: CreateAuditLogInput): string {
  return [
    input.description ?? "",
    input.forensic?.message ?? "",
    input.metadata_tag ?? "",
  ]
    .join(" ")
    .toUpperCase();
}

function isL6OrRansomwareContext(haystack: string): boolean {
  return (
    haystack.includes("IRONTECH_CHAOS_L6") ||
    haystack.includes("RANSOMWARE") ||
    haystack.includes("CRYPTOGRAPHIC LOCK") ||
    haystack.includes("CRYPTOGRAPHIC RANSOMWARE") ||
    haystack.includes("IRONCHAOS")
  );
}

function threatHeadlineFromContext(haystack: string, fallbackDetail: string): string {
  if (isL6OrRansomwareContext(haystack)) {
    return "⚠️ [IRONCHAOS] CRITICAL L6 RANSOMWARE INJECT ATTEMPT DETECTED";
  }
  const detail = fallbackDetail.trim();
  if (detail.length > 0) {
    const clipped = detail.length > 96 ? `${detail.slice(0, 93)}…` : detail;
    return `⚠️ ${clipped.toUpperCase()}`;
  }
  return "⚠️ SECURITY THREAT INTERCEPTED AT DMZ BOUNDARY";
}

function buildFromSecurityIntercept(input: CreateAuditLogInput): {
  threatDetected: string;
  agentAction: string;
  severity: "critical" | "warning";
} {
  const raw = input.description ?? input.forensic?.message ?? "";
  const haystack = haystackFromAudit(input);
  const { agent, detail } = bracketAgentDetail(raw);
  const threatDetected = threatHeadlineFromContext(haystack, detail);
  const agentAction =
    agent.toLowerCase().includes("irongate") || haystack.includes("IRONGATE")
      ? `[Irongate] ${detail || "Gateway authority engaged — hostile ingress quarantined before tenant envelope commit."}`
      : `[${agent}] Threat intercepted at constitutional boundary — ${detail || "payload held in DMZ quarantine."}`;
  return {
    threatDetected,
    agentAction,
    severity: isL6OrRansomwareContext(haystack) ? "critical" : "warning",
  };
}

function buildFromContainmentDeploy(input: CreateAuditLogInput): {
  threatDetected: string;
  agentAction: string;
  severity: "critical" | "warning";
} {
  const raw = input.description ?? input.forensic?.message ?? "";
  const haystack = haystackFromAudit(input);
  const { agent, detail } = bracketAgentDetail(raw);
  const threatDetected = isL6OrRansomwareContext(haystack)
    ? "⚠️ [IRONCHAOS] ACTIVE RANSOMWARE EXECUTION THREAD"
    : "⚠️ MALICIOUS EXECUTION THREAD DETECTED";
  const agentAction =
    agent.toLowerCase().includes("ironlock") || haystack.includes("IRONLOCK")
      ? `[Ironlock] ${detail || "Priority Interrupt Authority deployed: execution thread frozen and isolated to containment sandbox."}`
      : `[${agent}] Containment deployed — ${detail || "execution thread frozen pending analyst review."}`;
  return {
    threatDetected,
    agentAction,
    severity: "critical",
  };
}

export function parseIroncastNotificationFromAudit(
  input: CreateAuditLogInput,
): Omit<IroncastNotificationToast, "id" | "createdAt"> | null {
  if (!BLOCK_LEVEL_ACTIONS.has(input.action_type)) return null;

  if (input.action_type === "SECURITY_THREAT_INTERCEPTED") {
    return buildFromSecurityIntercept(input);
  }
  if (input.action_type === "INTERRUPT_CONTAINMENT_DEPLOYED") {
    return buildFromContainmentDeploy(input);
  }
  return null;
}

/** Client-only — Ironcast (Agent 7) toast dispatch from Audit Intelligence block events. */
export function dispatchIroncastNotificationFromAudit(input: CreateAuditLogInput): void {
  if (typeof window === "undefined") return;
  const payload = parseIroncastNotificationFromAudit(input);
  if (!payload) return;
  useIroncastNotificationStore.getState().pushToast(payload);
}

/** Stream fallback when telemetry bypasses structured audit (DMZ scratch / intelligence stream). */
export function dispatchIroncastNotificationFromStreamMessage(message: string): void {
  if (typeof window === "undefined") return;
  const trimmed = message.trim();
  if (!trimmed) return;
  const u = trimmed.toUpperCase();

  if (u.includes("SECURITY_THREAT_INTERCEPTED") || (u.includes("[IRONGATE]") && u.includes("ANOMALY"))) {
    dispatchIroncastNotificationFromAudit({
      action_type: "SECURITY_THREAT_INTERCEPTED",
      description: trimmed,
      log_type: "GRC",
    });
    return;
  }

  if (
    u.includes("INTERRUPT_CONTAINMENT_DEPLOYED") ||
    (u.includes("[IRONLOCK]") && (u.includes("INTERRUPT") || u.includes("CONTAINMENT")))
  ) {
    dispatchIroncastNotificationFromAudit({
      action_type: "INTERRUPT_CONTAINMENT_DEPLOYED",
      description: trimmed,
      log_type: "GRC",
    });
  }
}
