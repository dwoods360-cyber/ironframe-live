/**
 * Governance Frame publication-desk agent roster (GF-OPS-001).
 * These agents may stage / annotate quarantine only — never promote.
 */

export const GF_PUBLICATION_DESK_AGENT_IDS = [
  "gf-researcher",
  "gf-editor",
  "gf-verifier",
  "gf-regulatory-reviewer",
  "gf-product-boundary",
  "gf-operator",
] as const;

export type GfPublicationDeskAgentId = (typeof GF_PUBLICATION_DESK_AGENT_IDS)[number];

export type GfPublicationDeskAgent = {
  id: GfPublicationDeskAgentId;
  charterRole: string;
  mandate: string;
  /** May write markdown into docs/briefing-queue/ */
  mayStageQueue: boolean;
  /** May write .desk-reviews sidecar */
  mayWriteDeskReview: boolean;
  /** Must never call promote / deny / syndicate */
  mayPromote: false;
};

export const GF_PUBLICATION_DESK_AGENTS: readonly GfPublicationDeskAgent[] = [
  {
    id: "gf-researcher",
    charterRole: "Executive Intelligence Unit",
    mandate:
      "Topic research, source collection, synthesis, initial manuscript drafting, citation mapping, and claim/evidence labeling. AI output is never verified evidence.",
    mayStageQueue: true,
    mayWriteDeskReview: true,
    mayPromote: false,
  },
  {
    id: "gf-editor",
    charterRole: "Research Editor",
    mandate:
      "Structure, clarity, tone, duplication control, vendor neutrality, title/scope fit, and publication-class decision (paper vs briefing vs newsletter vs story).",
    mayStageQueue: true,
    mayWriteDeskReview: true,
    mayPromote: false,
  },
  {
    id: "gf-verifier",
    charterRole: "Source Verification Reviewer",
    mandate:
      "Inspect material sources, confirm citations support exact claims, classify source types, mark Verified/Unverified/Qualified/Out of Scope/Unsupported, document limitations.",
    mayStageQueue: false,
    mayWriteDeskReview: true,
    mayPromote: false,
  },
  {
    id: "gf-regulatory-reviewer",
    charterRole: "Regulatory / Legal-Scope Reviewer",
    mandate:
      "Editorial precision on final vs proposed rules, law vs guidance, binding vs voluntary frameworks, dates, jurisdiction, legal roles, and allegation vs adjudicated findings. Does not provide legal advice.",
    mayStageQueue: false,
    mayWriteDeskReview: true,
    mayPromote: false,
  },
  {
    id: "gf-product-boundary",
    charterRole: "Product Boundary Reviewer",
    mandate:
      "Keep Ironframe and other products as disclosed implementation examples only; block unsupported certifications, sales language, and product-as-regulation framing.",
    mayStageQueue: false,
    mayWriteDeskReview: true,
    mayPromote: false,
  },
  {
    id: "gf-operator",
    charterRole: "Editorial Review Board / Operator (advisory orchestration)",
    mandate:
      "Orchestrate desk passes and surface ready-for-human status. Final Approve / Hold / Deny remains a human Publisher/Founder action in Ops Hub.",
    mayStageQueue: false,
    mayWriteDeskReview: true,
    mayPromote: false,
  },
] as const;

export const GF_PUBLICATION_DESK_HUMAN_PUBLISHER = {
  role: "Publisher / Founder",
  mandate:
    "Sets agenda, protects independence, and alone approves, holds, or denies publication via Ops Hub promote/deny/hold.",
} as const;
