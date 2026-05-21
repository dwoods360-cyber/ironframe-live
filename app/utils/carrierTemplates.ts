/**
 * Carrier-specific narrative and attestation wording for insurance evidence exports.
 * All carrier names are illustrative / workflow labels — not endorsements.
 */

export const CARRIER_KEYS = ["GENERIC", "CHUBB", "BEAZLEY", "MUNICH_RE"] as const;
export type CarrierKey = (typeof CARRIER_KEYS)[number];

export type CarrierTemplate = {
  key: CarrierKey;
  /** UI + PDF display label */
  label: string;
  /** Primary narrative lenses for this carrier pack */
  narrativePriorities: [string, string];
  /** Underwriter application-style phrasing for the attestation block */
  attestation: {
    /** How we describe control effectiveness (form-aligned wording) */
    controlEffectiveness: string;
    /** Supplementary monitoring / telemetry assurance line */
    monitoringAssurance: string;
    /** Optional third line for “standard application” completeness */
    operationalResilience: string;
  };
};

export const CARRIER_REGISTRY: Record<CarrierKey, CarrierTemplate> = {
  GENERIC: {
    key: "GENERIC",
    label: "Generic GRC Gold",
    narrativePriorities: ["Evidence-grade control attestation", "Continuous validation coverage"],
    attestation: {
      controlEffectiveness:
        "The insured represents that material controls were subject to continuous validation with audit-relevant telemetry retained for underwriting review.",
      monitoringAssurance:
        "Security operations monitoring and agentic scrutiny outputs are maintained in a form suitable for regulatory and carrier examination.",
      operationalResilience:
        "Loss avoidance and labor-efficiency metrics are modeled for management and carrier discussion; final terms remain subject to binder and policy language.",
    },
  },
  CHUBB: {
    key: "CHUBB",
    label: "Chubb",
    narrativePriorities: ["Interconnected Risk", "Agentic Scrutiny Density"],
    attestation: {
      controlEffectiveness:
        "For Chubb-style cyber applications: the applicant attests that interconnected risk factors are mapped and that agentic scrutiny density (automated reasoning cycles per asset/time window) is measured and available for review.",
      monitoringAssurance:
        "Continuous monitoring posture is described in terms of correlated asset exposure and workforce/agent telemetry, consistent with systemic resilience disclosures.",
      operationalResilience:
        "Systemic resilience indicators (cross-asset heat, predictive positioning) are summarized to support non-standard risk dialogue where applicable.",
    },
  },
  BEAZLEY: {
    key: "BEAZLEY",
    label: "Beazley",
    narrativePriorities: ["Incident Lifecycle Automation", "Forensic Handshaking"],
    attestation: {
      controlEffectiveness:
        "For Beazley-style specialty cyber applications: the applicant attests that incident lifecycle automation (detect → triage → control validation) is documented with timestamps suitable for loss-adjustment forensics.",
      monitoringAssurance:
        "Forensic handshaking between automated agents and human sentinel workflows is evidenced, including reasoning logs and attestation artifacts where generated.",
      operationalResilience:
        "Response timeline metrics (e.g., mean time to detect / heartbeat-bound detection) are disclosed to support underwriting of automated response maturity.",
    },
  },
  MUNICH_RE: {
    key: "MUNICH_RE",
    label: "Munich Re",
    narrativePriorities: ["Actuarial BigInt ALE Exposure", "Asset-Specific Validation"],
    attestation: {
      controlEffectiveness:
        "For Munich Re–style actuarial cyber submissions: the applicant attests that annual loss expectancy (ALE) and asset-specific validation scopes are recorded using integer-cent (BigInt-safe) exposure math without floating-point drift.",
      monitoringAssurance:
        "Control effectiveness is expressed per asset/scope with mapping to compliance frameworks to support facultative and treaty pricing dialogue.",
      operationalResilience:
        "Modeled renewal incentives and discount stacking are illustrative; reinsurance and primary carrier technical pricing remain authoritative.",
    },
  },
};

export function normalizeCarrierKey(raw: string | null | undefined): CarrierKey {
  const u = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (u === "MUNICH" || u === "MUNICHRE") return "MUNICH_RE";
  if (CARRIER_KEYS.includes(u as CarrierKey)) return u as CarrierKey;
  return "GENERIC";
}

export function getCarrierTemplate(key: string | null | undefined): CarrierTemplate {
  return CARRIER_REGISTRY[normalizeCarrierKey(key)];
}

export const CARRIER_EXPORT_OPTIONS: Array<{ value: CarrierKey; label: string }> = [
  { value: "GENERIC", label: "Generic" },
  { value: "CHUBB", label: "Chubb" },
  { value: "BEAZLEY", label: "Beazley" },
  { value: "MUNICH_RE", label: "Munich Re" },
];
