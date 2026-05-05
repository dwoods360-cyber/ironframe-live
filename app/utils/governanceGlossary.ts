/**
 * Shared GRC-Gold governance definitions (Strategic Intel tooltips + Budget PDF appendix).
 */

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

/** Narrative lines for ALE = SLE × ARO (PDF appendix). */
export const GOVERNANCE_ALE_FORMULA_TITLE = "Mathematical context (risk quantification)";
export const GOVERNANCE_ALE_FORMULA_LINES = [
  "ALE = SLE × ARO",
  "SLE — Single Loss Expectancy: the monetary loss if a single adverse event occurs.",
  "ARO — Annual Rate of Occurrence: the estimated frequency of that event per year.",
] as const;
