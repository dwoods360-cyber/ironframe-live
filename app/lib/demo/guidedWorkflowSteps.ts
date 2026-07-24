/**
 * Public guided demo script — buyer-language steps only.
 * Uses sample demonstration figures; never cites synthetic seed tenants as customers.
 */

import { DEMO_ALE_BASELINE_DISPLAY, DEMO_ORG_NAME } from "@/app/lib/demo/demoModeConstants";

export type GuidedWorkflowStep = {
  id: string;
  /** Short chip label on the public tour (buyer-facing). */
  chipLabel: string;
  title: string;
  summary: string;
  /** Buyer-facing impact line (replaces internal “Outcome:” ops jargon when preferred). */
  impact: string;
  /** Label for the progressive “Next” control pointing at this step. */
  nextCtaLabel: string;
  /** Facts drawn from demonstration fixtures / product surfaces. */
  evidence: readonly string[];
  /** Optional deep-link into the existing demo UI after bootstrap. */
  sandboxHref?: string;
};

export const GUIDED_DEMO_COMPANY = {
  name: DEMO_ORG_NAME,
  disclaimer:
    "This demonstration uses representative benchmark data to illustrate platform workflows. Figures and entities are not live customer records.",
  sessionNotice:
    "Interactive demo environment: a self-contained, read-only session. No production credentials and no workspace setup required.",
} as const;

/**
 * Seven-step workflow for buyers — industry examples only, no seed-tenant names.
 */
export const GUIDED_WORKFLOW_STEPS: readonly GuidedWorkflowStep[] = [
  {
    id: "identify",
    chipLabel: "identify",
    title: "Risk identification",
    summary:
      "Threats and policy gaps enter the platform as structured, governed intake events — replacing unmonitored spreadsheets and delayed email notifications.",
    impact:
      "GRC and security teams immediately see a contextualized risk entry showing threat source, impacted asset, and active lifecycle state.",
    nextCtaLabel: "Risk identification",
    evidence: [
      "Healthcare enterprise scenario: “PHI Exfiltration Risk — EHR Perimeter.”",
      "Financial services scenario: “SWIFT Gateway Credential Rotation Gap.”",
      "Critical infrastructure scenario: “OT Network Segment Lateral Movement.”",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "exposure",
    chipLabel: "exposure",
    title: "Financial exposure",
    summary:
      "Exposure is expressed in whole dollars (stored as whole cents), not only High / Medium / Low labels.",
    impact: "Operators see quantified exposure baselines beside the risk context.",
    nextCtaLabel: "Financial exposure",
    evidence: [
      `Healthcare enterprise baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.medshield}`,
      `Financial services baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.vaultbank}`,
      `Critical infrastructure baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.gridcore}`,
      "Money fields stay in whole cents so finance and security can reconcile the same number.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "controls",
    chipLabel: "controls",
    title: "Controls linked",
    summary:
      "The identified risk is tied to the control and ownership context operators must defend — not left as an orphan ticket.",
    impact: "Risk, control expectation, and accountable workspace stay in one chain.",
    nextCtaLabel: "Controls",
    evidence: [
      "Demo dashboard shows open vs mitigated risk status per sample company lane.",
      "Policy status (active / draft) appears beside each company summary.",
      "Live framework mapping in production depends on your control pack — this step shows the linkage pattern only.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "evidence",
    chipLabel: "evidence",
    title: "Evidence collected",
    summary:
      "Evidence collection is continuous and workspace-scoped — not a last-minute screenshot pack before audit week.",
    impact: "Operators can point to an evidence trail attached to the same risk context.",
    nextCtaLabel: "Evidence",
    evidence: [
      "Evidence workflows live in the authenticated command workspace.",
      "This step explains the collection pattern; the sample home shows risk status, not a full vault seed.",
      "Demonstration screenshots are never treated as production attestations.",
    ],
  },
  {
    id: "quarantine",
    chipLabel: "review",
    title: "Evidence reviewed or held",
    summary:
      "Invalid or untrusted intake does not silently join the trusted record set — it waits for human review.",
    impact: "Suspicious change lands in an operator review state instead of polluting the ledger.",
    nextCtaLabel: "Review",
    evidence: [
      "External and vendor intake is sanitized before it can become trusted evidence.",
      "An elevated OT-style sample risk is marked for heightened review attention.",
      "Review and release controls in demo screens are labeled demonstration-only where present.",
    ],
  },
  {
    id: "remediation",
    chipLabel: "remediate",
    title: "Remediation assigned",
    summary:
      "Ownership and follow-through are explicit: someone is accountable for closing the gap.",
    impact: "Discovery-to-mitigation work is tracked with a named remediation path.",
    nextCtaLabel: "Remediation",
    evidence: [
      "Demo telemetry distinguishes active, pipeline, and mitigated exposure buckets.",
      "Sample active exposure: $96,500 · pipeline: $154,000 · mitigated: $42,000.",
      "Production remediation stays customer-operated; the demo shows the status progression pattern.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "report",
    chipLabel: "report",
    title: "Executive report",
    summary:
      "Executives receive a clean package from the same governed chain — not a rebuilt narrative after the fact.",
    impact: "A workspace-scoped export can be produced from the same governed records.",
    nextCtaLabel: "Executive report",
    evidence: [
      "Board-report and export paths live in the authenticated command workspace.",
      "Demo home projects maturity and company risk summaries for executive-style review.",
      "No invented customer logos or certifications are shown in this demonstration.",
    ],
    sandboxHref: "/demo/dashboard",
  },
] as const;
