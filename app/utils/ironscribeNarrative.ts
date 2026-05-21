/**
 * Ironscribe — constitutional GRC clerk: all expert-facing narratives and work-note copy
 * route through this module for third-person voice and TAS compliance closure.
 */

import {
  resolveExpertAgentName,
  type ExpertAgentCanonicalName,
} from "@/app/config/expertAgentPersona";

/** Closed under every Ironscribe-emitted record (Task 1 requirement). */
export const TAS_COMPLIANCE_SIGNATURE =
  "[TAS § COMPLIANCE SEAL — Ironscribe GRC Ledger v1]" as const;

/**
 * Short functional title for AUTHORITY lines (GRC-facing; distinct from long expert subtitle).
 */
export const IRONSCRIBE_FUNCTIONAL_TITLE: Record<ExpertAgentCanonicalName, string> = {
  Ironcore: "Executive Orchestration",
  Ironwave: "Telemetry Fusion",
  Irontrust: "Trust Fabric",
  Irontech: "Infrastructure Resilience",
  Ironscribe: "Immutable Ledger",
  Ironlock: "Priority Quarantine",
  Ironcast: "Broadcast Integrity",
  Ironsight: "Deep Trace Analytics",
  Ironlogic: "Policy Alignment",
  Ironmap: "Vendor Risk Surface",
  Ironintel: "Strategic Fusion",
  Ironguard: "RLS & Token Scope",
  Ironwatch: "Drift Sentinel",
  Irongate: "DMZ Ingress Control",
  Ironquery: "Evidence Federation",
  Ironscout: "Field Orchestration",
  Ironbloom: "CSRD Physical Ledger",
  Ironethic: "Ethics Guardrail",
  Irontally: "Export Reconciliation",
};

/** GRC keyword anchors per agent (mapped roster). */
export const IRONSCRIBE_GRC_KEYWORDS: Record<ExpertAgentCanonicalName, string> = {
  Ironcore: "SOX-aligned aggregation, blast-radius attestation",
  Ironwave: "NIST CSF detect / correlate",
  Irontrust: "Zero-standing identity, least-privilege",
  Irontech: "Resilience SLA, LKG verification",
  Ironscribe: "Immutable chain-of-custody, export integrity",
  Ironlock: "Containment, isolation, outbreak suppression",
  Ironcast: "Replica parity, broadcast non-repudiation",
  Ironsight: "IOC fusion, hunting telemetry",
  Ironlogic: "Policy-as-code, drift reconciliation",
  Ironmap: "TPRM, fourth-party exposure",
  Ironintel: "Strategic intel, sector fusion",
  Ironguard: "RLS enforcement, token lineage",
  Ironwatch: "Continuous controls monitoring",
  Irongate: "Tenant boundary, ingress sanitization",
  Ironquery: "Legal hold, federated evidence",
  Ironscout: "Task integrity, recon attestations",
  Ironbloom: "CSRD metrics, mass-balance",
  Ironethic: "Constitutional alignment, automated ethics gates",
  Irontally: "Ledger tallies, reconciliation tolerance",
};

function normalizedAgentKey(agent: string): string {
  return agent.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGrcBotAlias(agent: string): boolean {
  const k = normalizedAgentKey(agent);
  return k === "grcbot" || k === "grc bot" || k === "grc_bot";
}

function canonOrUnknown(agent: string): ExpertAgentCanonicalName | string {
  return resolveExpertAgentName(agent) ?? agent.trim();
}

export function functionalTitleForIronscribe(agent: ExpertAgentCanonicalName | string): string {
  if (isGrcBotAlias(String(agent))) return "Pipeline Governance";
  if (agent in IRONSCRIBE_FUNCTIONAL_TITLE) {
    return IRONSCRIBE_FUNCTIONAL_TITLE[agent as ExpertAgentCanonicalName];
  }
  return "Expert Authority";
}

function grcKeywords(agent: ExpertAgentCanonicalName | string): string {
  if (isGrcBotAlias(String(agent))) {
    return "Pipeline intake, GRC policy gates, constitutional routing";
  }
  if (agent in IRONSCRIBE_GRC_KEYWORDS) {
    return IRONSCRIBE_GRC_KEYWORDS[agent as ExpertAgentCanonicalName];
  }
  return "Ironframe constitutional controls";
}

/**
 * Full authority display for logs: `Ironlock | Priority Quarantine` (Task 3).
 */
export function agentAuthorityPipe(agent: string): string {
  const raw = agent.trim();
  if (!raw) return "Unknown | Expert Authority";
  if (isGrcBotAlias(raw)) {
    return "GRCbot | Pipeline Governance";
  }
  const canon = resolveExpertAgentName(raw);
  if (!canon) {
    const ft = functionalTitleForIronscribe(raw);
    return `${raw} | ${ft}`;
  }
  return `${canon} | ${functionalTitleForIronscribe(canon)}`;
}

/** SOC 2 / ISO control appendix for Irontally and GRCbot narratives (Task 1). */
export function controlMappingAppendix(agent: string): string {
  const canon = resolveExpertAgentName(agent);
  if (canon === "Irontally") {
    return "Control mapping: SOC 2 Trust Services Criteria CC6.1 (Logical and Physical Access Controls).";
  }
  if (isGrcBotAlias(agent)) {
    return "Control mapping: ISO/IEC 27001 Annex A (information security controls).";
  }
  return "";
}

/**
 * Third-person expert work note with GRC verbiage table and TAS closure (Task 1).
 * Irontally → SOC 2 CC6.1; GRCbot → ISO 27001.
 */
export function generateExpertWorkNote(agent: string, action: string, level?: string | number): string {
  const authority = agentAuthorityPipe(agent);
  const lvl =
    level === undefined || level === ""
      ? "operational standard"
      : typeof level === "number"
        ? `severity band ${level}`
        : String(level);
  const canon = canonOrUnknown(agent);
  const keywords = grcKeywords(canon);
  let body =
    `The constitutional record reflects that ${authority} completed "${action}" at ${lvl}. ` +
    `The evidentiary posture aligns with ${keywords}.`;
  const appendix = controlMappingAppendix(agent).trim();
  if (appendix) {
    body += ` ${appendix}`;
  }
  if (!body.endsWith(".")) body += ".";
  return `${body} ${TAS_COMPLIANCE_SIGNATURE}`;
}

/** @deprecated Prefer {@link generateExpertWorkNote}. */
export function formatAgentWorkNote(agent: string, action: string, level?: string | number): string {
  return generateExpertWorkNote(agent, action, level);
}

export type IronscribeClerkPayload = {
  agent: string;
  action: string;
  rawFacts?: string;
  level?: string | number;
};

/** Clerk output: single forensic line for DB / AuditLog / work-note embedding. */
export function ironscribeClerkFormat(payload: IronscribeClerkPayload): string {
  const authority = agentAuthorityPipe(payload.agent);
  const facts =
    (payload.rawFacts?.trim() ||
      `Recorded lifecycle action ${payload.action} under Ironframe governance.`) +
    (payload.level !== undefined
      ? ` (classification: ${typeof payload.level === "number" ? payload.level : String(payload.level)})`
      : "");

  const narrativeThird = facts.endsWith(".") ? facts : `${facts}.`;
  const appendix = controlMappingAppendix(payload.agent).trim();
  const appendixClause = appendix ? ` ${appendix}` : "";

  return (
    `🤖 [AGENT LOG] | AUTHORITY: ${authority}. ` +
    `Narrative: ${narrativeThird} Blast-radius and evidentiary posture were reconciled under independent third-person expert review.${appendixClause} ` +
    TAS_COMPLIANCE_SIGNATURE
  );
}

/** Handoff verification — Chain of Custody audit line (Task 3). */
export function ironscribeChainOfCustodyLine(sourceAgent: string, targetAgent: string): string {
  const s = agentAuthorityPipe(sourceAgent);
  const t = agentAuthorityPipe(targetAgent);
  return (
    `HANDOFF: ${s} -> ${t}. Reason: Transitioning to specialized remediation authority. ` +
    TAS_COMPLIANCE_SIGNATURE
  );
}

/** Map expert lifecycle gate index to clerk verb for payloads (7-gate constitutional path). */
export function ironscribeLifecycleActionForGate(step: 1 | 2 | 3 | 4 | 5 | 6 | 7): string {
  switch (step) {
    case 1:
      return "CLAIM";
    case 2:
      return "CONFIRM";
    case 3:
      return "AUTHORITY_SCOPE";
    case 4:
      return "CUSTODY_DECISION";
    case 5:
      return "EXPERT_ANALYSIS";
    case 6:
      return "ATTESTATION_SUBMIT";
    case 7:
      return "RESOLVE";
    default:
      return "RECORD";
  }
}
