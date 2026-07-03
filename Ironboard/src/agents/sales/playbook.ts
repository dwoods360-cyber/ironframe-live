export interface GRCPlaybookTier {
  name: string;
  /** Segment firmographics only — no pre-seeded company names (board must discover via live web grounding). */
  icpCriteria: string;
  targetALE: string;
  complianceFrameworks: string[];
  coreValueProposition: string;
}

export type BeachheadSegment = "regionalBHC" | "publicPower" | "communityHealth";

/**
 * Deterministic B2B sales playbook — beachhead segments only.
 * Named prospects MUST come from discoverRegionalProspects / market_prospects — never from this file.
 */
export const GRC_SALES_PLAYBOOK: Record<BeachheadSegment, GRCPlaybookTier> = {
  regionalBHC: {
    name: "Regional Bank Holding Company",
    icpCriteria:
      "US regional BHC $10B–$100B consolidated assets; 2–7 affiliate banks; FFIEC/GLBA/BSA programs; board reporting in dollars.",
    targetALE: "Fed regional BHC consolidated supervision ($10B–$100B assets)",
    complianceFrameworks: ["FFIEC IT Handbooks", "GLBA", "BSA/AML", "SOX overlay"],
    coreValueProposition:
      "Per-affiliate tenant enclaves with BigInt ALE for board reporting — parent/subsidiary audit boundaries without evidence cross-bleed.",
  },
  publicPower: {
    name: "Public Power & Mid-Market Utility",
    icpCriteria:
      "Public power or municipal utility; 200–5,000 employees; NERC CIP registrant or equivalent; OT/IT converged ops.",
    targetALE: "NERC CIP + OT/IT converged ops GRC",
    complianceFrameworks: ["NERC CIP", "TSA pipeline directives", "IEC 62443 alignment", "NIST CSF"],
    coreValueProposition:
      "Quantified command post with physical telemetry (kWh) and Irongate-sanitized ingest for elected boards and reliability compliance.",
  },
  communityHealth: {
    name: "Regional Community Health System",
    icpCriteria:
      "Regional community hospital system; 500–5,000 employees; HIPAA/HITRUST pressure; thin CISO bench; board cyber liability reporting.",
    targetALE: "HIPAA / HITRUST board-grade cyber liability",
    complianceFrameworks: ["HIPAA Security Rule", "HITRUST CSF", "NIST CSF for healthcare"],
    coreValueProposition:
      "Dollar-denominated cyber risk for trustees when CISO capacity is thin — LEVEL_1 grounded support, tenant-isolated exports.",
  },
};

/** @deprecated Use BeachheadSegment — legacy keys rejected at intake. */
export const LEGACY_FICTIONAL_BASELINE_TARGETS = ["Gridcore", "Vaultbank", "Medshield"] as const;
