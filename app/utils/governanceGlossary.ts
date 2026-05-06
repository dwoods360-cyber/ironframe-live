/**
 * GRC glossary entries + ingestion helpers. Shared constants live in `@/lib/constants`.
 */

export {
  DEFENSE_REGULATORY_SHIELD_BADGE_LABEL,
  GOVERNANCE_ALE_FORMULA_LINES,
  GOVERNANCE_ALE_FORMULA_TITLE,
  IRONWATCH_AGENT13_ATTESTATION_LINE,
  IRONWATCH_CLOSED_AUDIT_GAP_RE,
  IRONWATCH_HISTORICAL_CHAPTER_HREF,
  IRONWATCH_HISTORICAL_FLEXIBILITY_RE,
  IRONWATCH_HISTORICAL_MEMORY_KEYWORDS,
  IRONWATCH_INTEL_MATCH_SIDEBAR,
  IRONWATCH_LOW_CONFIDENCE_SEMANTIC_DRIFT,
  IRONWATCH_MODERN_REGULATORY_STRICT_RE,
  IRONWATCH_RESILIENCE_INTEL_MATCH_LINE,
  IRONWATCH_SEMANTIC_DRIFT_THRESHOLD,
  IRONWATCH_SHADOW_DISSENT_AUDIT_LABEL,
  IRONWATCH_SHADOW_DISSENT_LABEL,
  matchesIronwatchHistoricalMemoryKeywords,
  normalizeGrcProfileName,
} from "@/lib/constants/grcGovernance";

export type GovernanceGlossaryEntry = {
  term: string;
  description: string;
  /** Shown in PDF appendix as the audit / regulatory mapping column when set. */
  regulatoryReference?: string;
};

/**
 * Fixed glossary copy (tooltips + PDF). `industryLabel` is ignored; kept for call-site compatibility.
 */
export function buildGovernanceGlossaryEntries(_industryLabel?: string): GovernanceGlossaryEntry[] {
  return [
    {
      term: "Industry Average",
      description:
        "Baseline financial exposure ($ALE$) for peer organizations in the Healthcare sector.",
      regulatoryReference: "ISO 27001 Clause 4.1",
    },
    {
      term: "Your Current Risk",
      description: "Calculated real-time exposure based on unvalidated control hypotheses.",
    },
    {
      term: "Potential Impact",
      description:
        "Maximum localized financial 'Blast Radius' if specific crown-jewel assets are compromised.",
    },
    {
      term: "GRC Gap",
      description:
        "The financial delta between your current control posture and industry compliance mandates.",
      regulatoryReference: "SOC 2 CC2.1 (Risk Assessment)",
    },
  ];
}

/** Read `regulatoryShieldBadge` from governed ingestion JSON (Active Risk cards). */
export function parseRegulatoryShieldBadgeFromIngestion(ingestionDetails: string | null | undefined): string | null {
  const raw = ingestionDetails?.trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { regulatoryShieldBadge?: unknown };
    const b = j?.regulatoryShieldBadge;
    return typeof b === "string" && b.length > 0 ? b : null;
  } catch {
    return null;
  }
}
