import { TENANT_INDUSTRY_BASELINE_ALE_CENTS } from "@/app/constants/devTenantRoster";
import { TENANT_UUIDS, tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";

/** Machine-readable HITL review categories routed through the Control Room Review Queue. */
export type HitlReviewCategory =
  | "ALE_CIRCUIT_BREAKER"
  | "BREACH_ATTESTATION"
  | "UNQUARANTINE_OVERRIDE"
  | "CONFIG_AUDIT_TRAIL"
  | "GENERAL";

export type HitlChaosScenarioId =
  | "HITL_ALE_CIRCUIT_BREAKER"
  | "HITL_BREACH_ATTESTATION"
  | "HITL_UNQUARANTINE_OVERRIDE"
  | "HITL_CONFIG_AUDIT_TRAIL";

export const HITL_CATEGORY_TAG_PREFIX = "[HITL:";

export const HITL_ELEVATED_CATEGORIES: readonly HitlReviewCategory[] = [
  "ALE_CIRCUIT_BREAKER",
  "BREACH_ATTESTATION",
] as const;

/** Financial / breach attestations require CISO or ADMIN (GLOBAL_ADMIN / handshake ADMIN). */
export function hitlCategoryRequiresCisoAdmin(category: HitlReviewCategory): boolean {
  return (HITL_ELEVATED_CATEGORIES as readonly string[]).includes(category);
}

export function hitlCategoryFromChaosScenario(scenario: HitlChaosScenarioId): HitlReviewCategory {
  switch (scenario) {
    case "HITL_ALE_CIRCUIT_BREAKER":
      return "ALE_CIRCUIT_BREAKER";
    case "HITL_BREACH_ATTESTATION":
      return "BREACH_ATTESTATION";
    case "HITL_UNQUARANTINE_OVERRIDE":
      return "UNQUARANTINE_OVERRIDE";
    case "HITL_CONFIG_AUDIT_TRAIL":
      return "CONFIG_AUDIT_TRAIL";
    default:
      return "GENERAL";
  }
}

export function formatHitlApprovalNote(category: HitlReviewCategory, humanNote: string): string {
  return `${HITL_CATEGORY_TAG_PREFIX}${category}] ${humanNote.trim()}`;
}

export function parseHitlCategoryFromApprovalNote(note: string | null | undefined): HitlReviewCategory {
  const raw = (note ?? "").trim();
  const open = raw.indexOf(HITL_CATEGORY_TAG_PREFIX);
  if (open < 0) return "GENERAL";
  const start = open + HITL_CATEGORY_TAG_PREFIX.length;
  const close = raw.indexOf("]", start);
  if (close < 0) return "GENERAL";
  const token = raw.slice(start, close).trim().toUpperCase();
  if (token === "ALE_CIRCUIT_BREAKER") return "ALE_CIRCUIT_BREAKER";
  if (token === "BREACH_ATTESTATION") return "BREACH_ATTESTATION";
  if (token === "UNQUARANTINE_OVERRIDE") return "UNQUARANTINE_OVERRIDE";
  if (token === "CONFIG_AUDIT_TRAIL") return "CONFIG_AUDIT_TRAIL";
  return "GENERAL";
}

/** Ironframe platform scope vs client enterprise tenant (Command Center cookie). */
export function hitlTenantScopeLabel(tenantUuid: string | null): "Ironframe" | "Client" {
  if (!tenantUuid?.trim()) return "Ironframe";
  const key = tenantKeyFromUuid(tenantUuid.trim());
  return key ? "Client" : "Ironframe";
}

/** Read-only ALE baseline lookup — does not mutate constitutional anchors (11.1M / 5.9M / 4.7M). */
export function readOnlyTenantBaselineAleCents(tenantUuid: string): bigint {
  const key = tenantKeyFromUuid(tenantUuid);
  if (key && key in TENANT_INDUSTRY_BASELINE_ALE_CENTS) {
    return TENANT_INDUSTRY_BASELINE_ALE_CENTS[key as TenantKey];
  }
  return TENANT_INDUSTRY_BASELINE_ALE_CENTS.medshield;
}

/** Simulated fund reallocation — 2.5% of read-only baseline, BigInt integer cents only. */
export function computeSimulatedAleReallocationCents(tenantUuid: string): bigint {
  const baseline = readOnlyTenantBaselineAleCents(tenantUuid);
  return (baseline * 250n) / 10_000n;
}

export type HitlReviewIngestionMeta = {
  category: HitlReviewCategory;
  tenantScopeUuid: string;
  scenarioId: HitlChaosScenarioId;
  pendingLedgerCents?: string;
  remediationFrozen?: boolean;
  forensicManifestUrl?: string;
  quarantineNodeId?: string;
  configDelta?: {
    endpoint: string;
    previousHash: string;
    proposedHash: string;
  };
};

export const HITL_CHAOS_SCENARIO_CATALOG: readonly {
  id: HitlChaosScenarioId;
  label: string;
  description: string;
}[] = [
  {
    id: "HITL_ALE_CIRCUIT_BREAKER",
    label: "ALE Circuit Breaker (Financial Remediation)",
    description:
      "Simulated threat requiring fund reallocation — pending ledger entry in integer cents; reject freezes remediation.",
  },
  {
    id: "HITL_BREACH_ATTESTATION",
    label: "CISO Handshake (PII/CUI Breach Attestation)",
    description:
      "Ironintel exfil detection — forensic incident manifest requires CISO digital signature for vaulting.",
  },
  {
    id: "HITL_UNQUARANTINE_OVERRIDE",
    label: "Core Operational Override (Un-Quarantine)",
    description:
      "Ironlock quarantine on simulated core node — approve to resume traffic after self-healing verification.",
  },
  {
    id: "HITL_CONFIG_AUDIT_TRAIL",
    label: "Audit Trail (Notification / Webhook Delta)",
    description:
      "Critical notification endpoint change — secondary admin approval before config commit.",
  },
] as const;

export function isKnownClientTenantUuid(tenantUuid: string | null): boolean {
  if (!tenantUuid?.trim()) return false;
  return Object.values(TENANT_UUIDS).includes(tenantUuid.trim());
}
