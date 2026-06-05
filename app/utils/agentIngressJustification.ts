import type { ChaosScenario } from "@/app/actions/chaosActions";

/** Structured playbook row persisted on `ingestionDetails` and mirrored on `PipelineThreat`. */
export type AgentSuggestedRemediationOption = {
  id: string;
  label: string;
  /** Forensic resolution text (≥50 chars) bound when analyst selects this option. */
  resolutionText: string;
};

export type AgentIngressPayload = {
  /** Unique simulation thread — same as ThreatEvent.id / RiskEvent.id. */
  threadId?: string;
  orchestrationThreadId?: string;
  ingressJustification: string;
  suggestedRemediationOptions: AgentSuggestedRemediationOption[];
};

const PLAYBOOK_BASE_RESOLUTION =
  "Agent playbook closure: containment verified, blast radius mapped, and tenant isolation holds per Irontech constitutional authority. Human analyst concurrence recorded for GRC ledger export.";

function playbookOption(id: string, label: string, detail: string): AgentSuggestedRemediationOption {
  const resolutionText = [
    `AGENT_PLAYBOOK|${id}`,
    detail,
    PLAYBOOK_BASE_RESOLUTION,
  ].join(" ");
  return { id, label, resolutionText };
}

const DEFAULT_CHAOS_PLAYBOOKS: AgentSuggestedRemediationOption[] = [
  playbookOption(
    "CONTAIN_ISOLATE",
    "Contain & isolate tenant memory",
    "Ironlock sandbox engaged; execution thread frozen and PostgreSQL RLS partitions hardened.",
  ),
  playbookOption(
    "ROTATE_CREDENTIALS",
    "Rotate credentials & enforce token policy",
    "Ironguard token rotation enforced; multi-tenant memory isolated and session replay blocked.",
  ),
  playbookOption(
    "RESTORE_AVAILABILITY",
    "Restore availability & attest integrity",
    "Ironcast availability preserved; Irontrust cents integrity audit shows zero variance.",
  ),
];

export function buildChaosAgentIngressPayload(
  scenario: ChaosScenario,
  cardTitle?: string,
  threadId?: string,
): AgentIngressPayload {
  const label = cardTitle?.trim() || scenario;
  const tid = threadId?.trim() || undefined;
  const ingressJustification = [
    "[Irongate] [AGENT-14] Ingress justification:",
    `Controlled chaos scenario "${label}" reached the active board after DMZ quarantine.`,
    "Irontech agents intercepted the payload before production asset mutation.",
    "Analyst may close via a suggested playbook option below (no free-text required).",
  ].join(" ");

  const scenarioPlaybooks: Record<string, AgentSuggestedRemediationOption[]> = {
    CLOUD_EXFIL: [
      playbookOption(
        "QUARANTINE_EXFIL",
        "Quarantine exfil channel",
        "Ironlock hard quarantine applied to outbound object-store API keys and east-west paths.",
      ),
      ...DEFAULT_CHAOS_PLAYBOOKS.slice(1),
    ],
    REMOTE_SUPPORT: [
      playbookOption(
        "JIT_REMOTE_HANDOFF",
        "JIT remote support handoff",
        "Human operator tunnel authorized under 2-hour JIT grant; Irontech standing by for hotfix.",
      ),
      ...DEFAULT_CHAOS_PLAYBOOKS.slice(0, 2),
    ],
    CASCADING_FAILURE: [
      playbookOption(
        "IRONGATE_LOCKDOWN",
        "Irongate lockdown cascade",
        "Irongate lockdown sequence executed; Ironcast mass alert routed to constitutional authority.",
      ),
      ...DEFAULT_CHAOS_PLAYBOOKS,
    ],
  };

  return {
    ...(tid ? { threadId: tid, orchestrationThreadId: tid } : {}),
    ingressJustification,
    suggestedRemediationOptions: scenarioPlaybooks[scenario] ?? DEFAULT_CHAOS_PLAYBOOKS,
  };
}

/** L6 client mock — same shape for UI when a shadow row is hydrated from drill metadata. */
export function buildL6CryptographicRansomwareIngressPayload(): AgentIngressPayload {
  return {
    ingressJustification: [
      "[Irongate] [AGENT-14] Cryptographic ransomware extortion drill:",
      "High-frequency lock signature isolated at the DMZ boundary.",
      "[Ironlock] Execution thread frozen; containment sandbox active before envelope ingestion.",
      "No committed threat envelope reached Risk Ingestion — forensic closure via playbook only.",
    ].join(" "),
    suggestedRemediationOptions: [
      playbookOption(
        "RANSOMWARE_CONTAINED",
        "Ransomware contained — availability preserved",
        "[Ironcast] SYSTEM SECURITY WARNING: RANSOMWARE THREAT CONTAINED // AVAILABILITY PRESERVED.",
      ),
      playbookOption(
        "CRYPTO_SIGNATURE_REVOKED",
        "Revoke cryptographic lock signatures",
        "Ironguard enforced token rotation and tenant-scoped RLS after signature quarantine.",
      ),
      playbookOption(
        "FORENSIC_EXPORT",
        "Export forensic bundle to ledger",
        "Irontrust financial integrity audit complete with zero USD variance; ledger export ready.",
      ),
    ],
  };
}

/** Generic workforce / DMZ ingress fallback. */
export function buildWorkforceAgentIngressPayload(
  sourceAgent: string,
  title: string,
  threadId?: string,
): AgentIngressPayload {
  const agent = sourceAgent.trim() || "IRONWAVE";
  const tid = threadId?.trim() || undefined;
  return {
    ...(tid ? { threadId: tid, orchestrationThreadId: tid } : {}),
    ingressJustification: [
      `[${agent}] Workforce ingress justification:`,
      `Signal "${title}" ingested after DMZ standard telemetry screening.`,
      "Automated agents validated blast radius and assigned constitutional authority for closure.",
    ].join(" "),
    suggestedRemediationOptions: DEFAULT_CHAOS_PLAYBOOKS,
  };
}

function parseIngestionObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* non-JSON */
  }
  return null;
}

export function parseAgentIngressFromIngestion(
  ingestionDetails: string | null | undefined,
): AgentIngressPayload | null {
  const j = parseIngestionObject(ingestionDetails);
  if (!j) return null;

  const ingressRaw = j.ingressJustification;
  const ingressJustification =
    typeof ingressRaw === "string" && ingressRaw.trim() ? ingressRaw.trim() : "";

  const optionsRaw = j.suggestedRemediationOptions;
  const suggestedRemediationOptions: AgentSuggestedRemediationOption[] = [];
  if (Array.isArray(optionsRaw)) {
    for (const item of optionsRaw) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id.trim() : "";
      const label = typeof o.label === "string" ? o.label.trim() : "";
      const resolutionText =
        typeof o.resolutionText === "string" ? o.resolutionText.trim() : "";
      if (!id || !label || resolutionText.length < 50) continue;
      suggestedRemediationOptions.push({ id, label, resolutionText });
    }
  }

  if (!ingressJustification && suggestedRemediationOptions.length === 0) {
    return null;
  }

  return {
    ingressJustification:
      ingressJustification ||
      "Agent ingress justification not recorded — select a suggested playbook option to bind closure evidence.",
    suggestedRemediationOptions,
  };
}

export function mergeAgentIngressIntoIngestionJson(
  existing: string | Record<string, unknown> | null | undefined,
  payload: AgentIngressPayload,
): string {
  const base =
    typeof existing === "string"
      ? parseIngestionObject(existing)
      : existing && typeof existing === "object"
        ? existing
        : null;
  const merged = {
    ...(base ?? {}),
    ...(payload.threadId ? { threadId: payload.threadId } : {}),
    ...(payload.orchestrationThreadId
      ? { orchestrationThreadId: payload.orchestrationThreadId }
      : {}),
    ingressJustification: payload.ingressJustification,
    suggestedRemediationOptions: payload.suggestedRemediationOptions,
  };
  return JSON.stringify(merged);
}
