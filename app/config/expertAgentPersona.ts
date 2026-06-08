import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";

/** Stable DB `assignee_id` prefix for constitutional expert roster (01–19). */
export const EXPERT_ASSIGNEE_KEY_PREFIX = "exp_" as const;

/**
 * Expert titles for Audit Intelligence actor strings and assignee display (`Name | Title`).
 * Indexed to `CORE_WORKFORCE_AGENTS` (constitutional 19-agent fleet).
 * Each entry retains an evolved operational title; constitutional mandate is tagged inline.
 */
export const EXPERT_AGENT_TITLES: Record<string, string> = {
  Ironcore: "Core Threat Aggregation & Blast-Radius", // Constitutional Role: Orchestrator & Routing
  Ironwave: "Telemetry Fusion & Signal Orchestration", // Constitutional Role: Live Telemetry Monitoring
  Irontrust: "Identity Posture & Trust Fabric", // Constitutional Role: Scoring Engine (ALE Math)
  Irontech: "Infrastructure & Resilience", // Constitutional Role: Self-Healing
  Ironscribe: "Immutable Audit Export & Ledger Chain", // Constitutional Role: Deep-Doc Worker
  Ironlock: "Priority Interrupt & Quarantine", // Constitutional Role: Priority Override / Emergency
  Ironcast: "Stream Replication & Broadcast Integrity", // Constitutional Role: Switchboard / Notification
  Ironsight: "Deep Trace & Behavioral Analytics", // Constitutional Role: Tactical Sentinel
  Ironlogic: "Policy Translation & Rule Alignment", // Constitutional Role: Neural Policy Learner
  Ironmap: "Vendor Surface & Supply-Chain Mapping", // Constitutional Role: Supply Chain Graphing
  Ironintel: "Strategic Correlation & Fusion Cell", // Constitutional Role: OSINT & Policy Monitor
  Ironguard: "RLS & Token Security", // Constitutional Role: The Warden (AppSec)
  Ironwatch: "Continuous Monitoring & Drift Sentinel", // Constitutional Role: Anomaly Hunter (UBA)
  Irongate: "DMZ Ingress & Tenant Stamping", // Constitutional Role: Data Sanitizer (DMZ)
  Ironquery: "Evidence Query & Federated Retrieval", // Constitutional Role: Interactive Analyst / Copilot
  Ironscout: "Task Orchestration & Field Recon", // Constitutional Role: Ad-Hoc Tracker
  Ironbloom: "CSRD Ledger & Sustainability Metrics", // Constitutional Role: Sustainability Analyst
  Ironethic: "Ethics Guardrail & Constitutional Alignment", // Constitutional Role: Social & DEI Monitor
  Irontally: "Export Reconciliation & Tallies", // Constitutional Role: Disclosure & Framework Mapper
};

export type ExpertAgentCanonicalName = (typeof CORE_WORKFORCE_AGENTS)[number]["name"];

export function listExpertAgentNames(): readonly string[] {
  return CORE_WORKFORCE_AGENTS.map((a) => a.name);
}

/** Resolve canonical agent name (PascalCase roster key) or null. */
export function resolveExpertAgentName(input: string): ExpertAgentCanonicalName | null {
  const t = input?.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const hit = CORE_WORKFORCE_AGENTS.find((a) => a.name.toLowerCase() === lower);
  return hit ? hit.name : null;
}

export function getExpertTitle(agentName: string): string {
  const canon = resolveExpertAgentName(agentName);
  if (!canon) return "Expert Analyst";
  return EXPERT_AGENT_TITLES[canon] ?? "Expert Analyst";
}

/** `[Name] | [Title]` for assignee display and audit `actor`. */
export function getExpertAssigneeDisplay(agentName: string): string {
  const canon = resolveExpertAgentName(agentName);
  if (!canon) return `${agentName.trim()} | Expert Analyst`;
  return `${canon} | ${EXPERT_AGENT_TITLES[canon] ?? "Expert Analyst"}`;
}

/** Persisted `ThreatEvent.assigneeId` / `SimThreatEvent.assigneeId` key, e.g. `exp_ironlock`. */
export function getExpertAssigneeKey(agentName: string): string {
  const canon = resolveExpertAgentName(agentName);
  const slug = (canon ?? agentName).trim().toLowerCase().replace(/\s+/g, "_");
  return `${EXPERT_ASSIGNEE_KEY_PREFIX}${slug}`;
}

/** Resolve UI label for persisted expert assignee keys (optional board integration). */
export function displayForExpertAssigneeKey(assigneeId: string | null | undefined): string | null {
  if (assigneeId == null || assigneeId.trim() === "") return null;
  const id = assigneeId.trim().toLowerCase();
  if (!id.startsWith(EXPERT_ASSIGNEE_KEY_PREFIX)) return null;
  const slug = id.slice(EXPERT_ASSIGNEE_KEY_PREFIX.length);
  const agent = CORE_WORKFORCE_AGENTS.find((a) => a.name.toLowerCase() === slug);
  if (!agent) return null;
  return getExpertAssigneeDisplay(agent.name);
}

export function buildDualTimestamps(now = new Date()): {
  timestampUtc: string;
  timestampLocal: string;
} {
  return {
    timestampUtc: now.toISOString(),
    timestampLocal: now.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }),
  };
}

/**
 * Domain narrative for expert work-note / forensic justification.
 * `threatType` may be sourceAgent, entityType, chaosScenario label, or generic.
 */
export function getExpertJustification(agentName: string, threatType: string): string {
  const canon = resolveExpertAgentName(agentName) ?? agentName.trim();
  const tt = (threatType ?? "").trim() || "GENERIC";
  const upper = tt.toUpperCase();

  switch (canon) {
    case "Ironlock":
      return "Heuristic analysis confirmed high-risk payload. Quarantine protocols engaged to prevent lateral pivot.";
    case "Ironlogic":
      return "Configuration drift detected against machine-translated policy. Rule-set re-aligned to baseline.";
    case "Ironguard":
      return "Row-level scope and token lineage verified; unauthorized privilege paths eliminated from execution graph.";
    case "Irongate":
      return "Ingress telemetry scrubbed and tenant boundary stamped; DMZ release authorized under constitutional charter.";
    case "Irontech":
      return "Infrastructure blast radius contained; resilience checkpoints validated against last-known-good posture.";
    case "Ironsight":
      return "Deep-trace fusion correlated IOCs with historical adversary tradecraft; containment narrative sealed.";
    case "Ironcore":
      return "Signal aggregation converged on authoritative blast-radius; executive rollup reconciled to ledger.";
    case "Ironwave":
      return "Cross-plane telemetry fused under Ironwave correlation windows; anomaly streak isolated and bounded.";
    case "Irontrust":
      return "Trust fabric assertions reconciled; stale principals revoked under zero-standing policy.";
    case "Ironscribe":
      return "Immutable export chain anchored; audit lineage hashed for downstream attestation consumers.";
    case "Ironcast":
      return "Broadcast replicas verified against canonical stream; ephemeral forks suppressed.";
    case "Ironmap":
      return "Third-party dependency graph rescanned; vendor blast chord reranked by exposure velocity.";
    case "Ironintel":
      return "Strategic fusion matched indicators to sector-wide campaigns; escalation tier adjusted accordingly.";
    case "Ironwatch":
      return "Continuous sentinel sweep detected configuration drift; drift packets reconciled to approved baseline.";
    case "Ironquery":
      return "Federated evidence retrieval satisfied prosecutor queries without cross-tenant bleed-through.";
    case "Ironscout":
      return "Orchestrated recon validated lateral hypotheses; kill-chain hypotheses updated for operators.";
    case "Ironbloom":
      return "Physical-unit sustainability ledger reconciled; CSRD disclosure deltas computed without phantom mass.";
    case "Ironethic":
      return "Ethical posture gates satisfied; automated decisions constrained to published constitutional bounds.";
    case "Irontally":
      return "Export tallies reconciled against immutable counters; residual variance cleared within tolerance.";
    default:
      break;
  }

  if (upper.includes("CHAOS") || upper.includes("DRILL")) {
    return `${canon} executed controlled chaos reconciliation; synthetic blast contained per drill charter.`;
  }
  if (upper.includes("RANSOM") || upper.includes("MALWARE")) {
    return `${canon} correlated execution artifacts with known ransomware families; isolation stance escalated.`;
  }
  if (upper.includes("PHISH") || upper.includes("CREDENTIAL")) {
    return `${canon} validated identity-subversion indicators; credential replay surfaces neutralized.`;
  }

  return `${canon} delivered expert remediation aligned to Ironframe constitutional controls for ${tt}.`;
}

/** Autonomous referral when detection domain exceeds current agent authority. */
export type ExpertHandoffDecision =
  | { needsHandoff: false }
  | {
      needsHandoff: true;
      targetAgent: ExpertAgentCanonicalName;
      /** Audit / matrix key (e.g. MALWARE). */
      reasonKey: string;
    };

/**
 * Matrix: Ironsight + malware-class signal → Ironlock; Irontrust + financial drift → Ironcore orchestration.
 * `threatClassificationSignal` should include ingestion/title tokens (see `inferExpertThreatSignalForHandoff` in threatActions).
 */
export function needsExpertHandoff(
  currentAgent: string,
  threatClassificationSignal: string,
): ExpertHandoffDecision {
  const canon = resolveExpertAgentName(currentAgent);
  if (!canon) return { needsHandoff: false };
  const raw = threatClassificationSignal.toUpperCase();

  if (canon === "Ironsight" && raw.includes("MALWARE")) {
    return { needsHandoff: true, targetAgent: "Ironlock", reasonKey: "MALWARE" };
  }
  if (canon === "Irontrust" && (raw.includes("FINANCIAL_DRIFT") || raw.includes("FINANCIAL DRIFT"))) {
    return { needsHandoff: true, targetAgent: "Ironcore", reasonKey: "FINANCIAL_DRIFT" };
  }
  return { needsHandoff: false };
}
