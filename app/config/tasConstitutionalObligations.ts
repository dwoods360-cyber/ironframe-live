/**
 * Constitutional obligations cross-walked for Irontally gap analysis (Law vs TAS.md).
 */
export type TasConstitutionalObligation = {
  id: string;
  tasSection: string;
  tasSectionTitle: string;
  anchorId: string;
  tasLine: number;
  agentLabel: string;
  /** Human-readable current posture from TAS.md / workforce mandate */
  currentPosture: string;
  /** Regex patterns on regulation text that trigger this obligation */
  regulationTriggers: RegExp[];
  /** Required notification / response window in days when law specifies days */
  impliedRequiredDays?: number;
};

export const TAS_CONSTITUTIONAL_OBLIGATIONS: readonly TasConstitutionalObligation[] = [
  {
    id: "incident_response_notification",
    tasSection: "4.2",
    tasSectionTitle: "Incident Response & Notification",
    anchorId: "agent-7",
    tasLine: 46,
    agentLabel: "Ironcast (Agent 7)",
    currentPosture:
      "Ironcast (Switchboard) manages outbound alerts and human-in-the-loop escalation; default operational cadence targets 45-day executive notification cycles unless overridden by drill policy.",
    regulationTriggers: [
      /breach notification/i,
      /incident notification/i,
      /reg(ulation)?\s*s-?p/i,
      /notify.*within\s*(\d+)\s*days?/i,
      /(\d+)\s*day.*breach/i,
    ],
    impliedRequiredDays: 30,
  },
  {
    id: "tenant_isolation",
    tasSection: "5",
    tasSectionTitle: "Multi-Tenant Isolation",
    anchorId: "tas-rls-isolation",
    tasLine: 108,
    agentLabel: "Ironlock / RLS",
    currentPosture:
      "Supabase RLS and Ironguard client gates enforce tenant_id on every scoped read/write; cross-tenant retrieval is a terminal failure.",
    regulationTriggers: [
      /tenant isolation/i,
      /multi-tenant/i,
      /row level security/i,
      /data segregation/i,
    ],
  },
  {
    id: "ai_governance",
    tasSection: "2 / 19",
    tasSectionTitle: "AI Governance & Disclosure",
    anchorId: "agent-19",
    tasLine: 58,
    agentLabel: "Irontally (Agent 19)",
    currentPosture:
      "Irontally maps operational telemetry to CSRD, GRI, ISSB, and SOC/ISO/NIST frameworks; Agent 19 is the disclosure mapper — SB24-205-style AI governance requires explicit amendment for state-level algorithmic accountability.",
    regulationTriggers: [
      /ai governance/i,
      /artificial intelligence/i,
      /algorithmic/i,
      /sb24-205/i,
      /colorado.*ai/i,
    ],
    impliedRequiredDays: 90,
  },
  {
    id: "dmz_ingestion",
    tasSection: "3",
    tasSectionTitle: "DMZ & Data Sanitization",
    anchorId: "agent-14",
    tasLine: 53,
    agentLabel: "Irongate (Agent 14)",
    currentPosture:
      "All external ingestion MUST route through Irongate for sanitization before the internal bus — bypass is a critical violation.",
    regulationTriggers: [/data sanitiz/i, /dmz/i, /perimeter security/i, /data masking/i],
  },
  {
    id: "forensic_logging",
    tasSection: "LOGGING",
    tasSectionTitle: "Audit Intelligence Logging Directive",
    anchorId: "tas-logging-directive",
    tasLine: 10,
    agentLabel: "Ironwatch / Audit Intelligence",
    currentPosture:
      "100% fidelity logging to Audit Intelligence for all agent and adversarial actions — silencing logs is a terminal violation.",
    regulationTriggers: [/audit trail/i, /logging/i, /recordkeeping/i],
  },
  {
    id: "sustainability_building_benchmark",
    tasSection: "6",
    tasSectionTitle: "Sustainability & Grid Evidence",
    anchorId: "ironbloom-production",
    tasLine: 56,
    agentLabel: "Ironbloom (Agent 17)",
    currentPosture:
      "Ironbloom Gridcore rate seals, Carbon Pulse telemetry, and WORM Sustainability Achievement reports provide automated evidence for jurisdictional building performance and ESG filing pipelines.",
    regulationTriggers: [/benchmark/i, /building performance/i, /\bbps\b/i, /clean buildings/i, /minnesota/i],
    impliedRequiredDays: 90,
  },
  {
    id: "dora_ict_resilience",
    tasSection: "4",
    tasSectionTitle: "Operational Resilience",
    anchorId: "agent-13",
    tasLine: 48,
    agentLabel: "Ironwatch (Agent 13)",
    currentPosture:
      "Ironwatch health-posture triage and gridcore-rate-poll crons provide ICT resilience telemetry for DORA-aligned financial entities.",
    regulationTriggers: [/dora/i, /digital operational resilience/i, /ict incident/i, /financial entity/i],
    impliedRequiredDays: 24,
  },
  {
    id: "eu_ai_act_high_risk",
    tasSection: "2 / 19",
    tasSectionTitle: "High-Risk AI Systems",
    anchorId: "agent-19",
    tasLine: 58,
    agentLabel: "Irontally (Agent 19)",
    currentPosture:
      "Irontally maps Art. 9–15 obligations to Irongate ingress, Ironlock oversight, and Irontrust BigInt risk quantification.",
    regulationTriggers: [/eu ai act/i, /high-risk ai/i, /art\.?\s*9/i, /art\.?\s*15/i],
    impliedRequiredDays: 90,
  },
  {
    id: "nydfs_mfa",
    tasSection: "3",
    tasSectionTitle: "Privileged Access & MFA",
    anchorId: "agent-14",
    tasLine: 53,
    agentLabel: "Irongate / Bank Vault",
    currentPosture:
      "Bank Vault Gate A PKI signatures and constitutional emergency MFA overlay satisfy NYDFS Part 500.12 attestation requirements.",
    regulationTriggers: [/nydfs/i, /part 500/i, /500\.12/i, /multi-factor authentication/i],
  },
  {
    id: "uk_csr_incident",
    tasSection: "4.2",
    tasSectionTitle: "UK Material Incident Notification",
    anchorId: "agent-7",
    tasLine: 46,
    agentLabel: "Ironcast (Agent 7)",
    currentPosture:
      "Ironcast manages executive notification paths; UK CS&R 24h/72h material incident windows require drill policy alignment.",
    regulationTriggers: [/uk cs&r/i, /cyber security and resilience/i, /24 hours/i, /72 hours/i, /material incident/i],
    impliedRequiredDays: 1,
  },
];

export function extractRequiredDaysFromRegulation(text: string): number | null {
  const m =
    text.match(/within\s*(\d+)\s*(?:calendar\s*)?days?/i) ??
    text.match(/(\d+)\s*day[s]?\s*(?:breach|notification|notice)/i);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
