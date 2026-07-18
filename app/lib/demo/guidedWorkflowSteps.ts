/**
 * Public guided demo script — buyer-language steps only.
 * Uses existing sandbox demonstration fixtures; does not invent live customer data.
 */

import {
  DEMO_ALE_BASELINE_DISPLAY,
  DEMO_ORG_NAME,
  DEMO_WORKSPACE_SLUG,
} from "@/app/lib/demo/demoModeConstants";

export type GuidedWorkflowStep = {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  /** Facts drawn from existing demo fixtures / product surfaces. */
  evidence: readonly string[];
  /** Optional deep-link into the existing sandbox UI after bootstrap. */
  sandboxHref?: string;
};

export const GUIDED_DEMO_COMPANY = {
  name: DEMO_ORG_NAME,
  slug: DEMO_WORKSPACE_SLUG,
  disclaimer:
    "All figures and entities below are demonstration data for product evaluation. They are not live customer records.",
} as const;

/**
 * Seven-step workflow from the public GTM plan, grounded in Acme sandbox fixtures
 * (Medshield / Vaultbank / Gridcore demo baselines already in repo).
 */
export const GUIDED_WORKFLOW_STEPS: readonly GuidedWorkflowStep[] = [
  {
    id: "identify",
    title: "Risk is identified",
    summary:
      "A threat enters the workspace as a governed intake item — not a spreadsheet row waiting for someone to notice.",
    outcome: "Operators see a named risk with source, target, and lifecycle state.",
    evidence: [
      "Sandbox fixture: “PHI Exfiltration — EHR Perimeter” (Medshield healthcare lane).",
      "Sandbox fixture: “SWIFT Gateway Credential Rotation Gap” (Vaultbank finance lane).",
      "Sandbox fixture: “OT Segment Lateral Movement — Gridcore” (infrastructure lane).",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "exposure",
    title: "Financial exposure is estimated",
    summary:
      "Exposure is expressed in whole-dollar cents, not only High / Medium / Low labels.",
    outcome: "Demo enclaves show quantified ALE baselines in whole cents beside the risk context.",
    evidence: [
      `Medshield healthcare ALE baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.medshield}`,
      `Vaultbank finance ALE baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.vaultbank}`,
      `Gridcore infrastructure ALE baseline (demo): ${DEMO_ALE_BASELINE_DISPLAY.gridcore}`,
      "Monetary fields in Ironframe use BigInt integer cents — no floating-point drift.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "controls",
    title: "Controls are linked",
    summary:
      "The identified risk is tied to the control and ownership context operators must defend — not left as an orphan ticket.",
    outcome: "Risk, control expectation, and accountable workspace stay in one chain.",
    evidence: [
      "Demo dashboard projects open vs mitigated risk status per fictional company lane.",
      "Policy status chips (ACTIVE / DRAFT) appear beside each demo company summary.",
      "Live statutory mapping in production depends on the customer’s framework pack — this step shows the linkage pattern only.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "evidence",
    title: "Evidence is collected",
    summary:
      "Evidence collection is continuous and workspace-scoped — not a last-minute screenshot pack before audit week.",
    outcome: "Operators can point to an evidence trail attached to the same risk context.",
    evidence: [
      "Product surface: Evidence / vault workflows exist in the authenticated command post.",
      "This guided step explains the intended collection pattern; the sandbox home shows telemetry and risk status, not a full evidence vault seed.",
      "Demonstration rule: never treat sandbox screenshots as production attestations.",
    ],
  },
  {
    id: "quarantine",
    title: "Evidence is reviewed or quarantined",
    summary:
      "Invalid or untrusted ingress does not silently join the trusted record set — it waits for human review.",
    outcome: "Suspicious change lands in an operator review state instead of polluting the ledger.",
    evidence: [
      "Platform posture: Irongate sanitizes external ingress before trusted persistence.",
      "Demo OT threat fixture is marked ESCALATED to illustrate elevated review attention.",
      "Quarantine / release controls in vendor screens are labeled demonstration-only where present.",
    ],
  },
  {
    id: "remediation",
    title: "Remediation is assigned",
    summary:
      "Ownership and follow-through are explicit: someone is accountable for closing the gap.",
    outcome: "Discovery-to-mitigation work is tracked with a named remediation path.",
    evidence: [
      "Demo telemetry distinguishes active, pipeline, and mitigated exposure buckets.",
      "Sandbox active exposure (demo): $96,500 · pipeline: $154,000 · mitigated: $42,000.",
      "Production remediation tickets remain customer-operated; the demo shows the status progression pattern.",
    ],
    sandboxHref: "/demo/dashboard",
  },
  {
    id: "report",
    title: "Board or audit report is generated",
    summary:
      "Executives receive a clean package from the same governed chain — not a rebuilt narrative after the fact.",
    outcome: "A tenant-scoped export can be produced from the same governed workspace records.",
    evidence: [
      "Product surfaces include board-report and export paths in the authenticated command post.",
      "Demo home projects governance maturity and company risk summaries for executive-style review.",
      "No invented customer logos or certifications are shown in this demonstration.",
    ],
    sandboxHref: "/demo/dashboard",
  },
] as const;
