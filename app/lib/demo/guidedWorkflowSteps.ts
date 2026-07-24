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
  outcome: string;
  /** Facts drawn from demonstration fixtures / product surfaces. */
  evidence: readonly string[];
  /** Optional deep-link into the existing demo UI after bootstrap. */
  sandboxHref?: string;
};

export const GUIDED_DEMO_COMPANY = {
  name: DEMO_ORG_NAME,
  disclaimer:
    "All figures and entities below are sample demonstration data for product evaluation. They are not live customer records.",
} as const;

/**
 * Seven-step workflow for buyers — industry examples only, no seed-tenant names.
 */
export const GUIDED_WORKFLOW_STEPS: readonly GuidedWorkflowStep[] = [
  {
    id: "identify",
    chipLabel: "identify",
    title: "Risk is identified",
    summary:
      "A risk enters the workspace as a named intake item — not a spreadsheet row waiting for someone to notice.",
    outcome: "Operators see a named risk with source, target, and lifecycle state.",
    evidence: [
      "Example (healthcare): “PHI Exfiltration — EHR Perimeter.”",
      "Example (finance): “SWIFT Gateway Credential Rotation Gap.”",
      "Example (infrastructure): “OT Segment Lateral Movement.”",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "exposure",
    chipLabel: "exposure",
    title: "Financial exposure is estimated",
    summary:
      "Exposure is expressed in whole dollars (stored as whole cents), not only High / Medium / Low labels.",
    outcome: "Operators see quantified exposure baselines beside the risk context.",
    evidence: [
      `Illustrative healthcare baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.medshield}`,
      `Illustrative finance baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.vaultbank}`,
      `Illustrative infrastructure baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.gridcore}`,
      "Money fields stay in whole cents so finance and security can reconcile the same number.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "controls",
    chipLabel: "controls",
    title: "Controls are linked",
    summary:
      "The identified risk is tied to the control and ownership context operators must defend — not left as an orphan ticket.",
    outcome: "Risk, control expectation, and accountable workspace stay in one chain.",
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
    title: "Evidence is collected",
    summary:
      "Evidence collection is continuous and workspace-scoped — not a last-minute screenshot pack before audit week.",
    outcome: "Operators can point to an evidence trail attached to the same risk context.",
    evidence: [
      "Evidence workflows live in the authenticated command workspace.",
      "This step explains the collection pattern; the sample home shows risk status, not a full vault seed.",
      "Demonstration screenshots are never treated as production attestations.",
    ],
  },
  {
    id: "quarantine",
    chipLabel: "review",
    title: "Evidence is reviewed or held",
    summary:
      "Invalid or untrusted intake does not silently join the trusted record set — it waits for human review.",
    outcome: "Suspicious change lands in an operator review state instead of polluting the ledger.",
    evidence: [
      "External and vendor intake is sanitized before it can become trusted evidence.",
      "An elevated OT-style sample risk is marked for heightened review attention.",
      "Review and release controls in demo screens are labeled demonstration-only where present.",
    ],
  },
  {
    id: "remediation",
    chipLabel: "remediate",
    title: "Remediation is assigned",
    summary:
      "Ownership and follow-through are explicit: someone is accountable for closing the gap.",
    outcome: "Discovery-to-mitigation work is tracked with a named remediation path.",
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
    title: "Board or audit report is generated",
    summary:
      "Executives receive a clean package from the same governed chain — not a rebuilt narrative after the fact.",
    outcome: "A workspace-scoped export can be produced from the same governed records.",
    evidence: [
      "Board-report and export paths live in the authenticated command workspace.",
      "Demo home projects maturity and company risk summaries for executive-style review.",
      "No invented customer logos or certifications are shown in this demonstration.",
    ],
    sandboxHref: "/demo/dashboard",
  },
] as const;
