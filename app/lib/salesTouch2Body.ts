/**
 * Touch 2 EMAIL body — same layout as Touch 1 (`buildC1LockedEmailBody`):
 *
 *   Hi {{name}},
 *
 *   [open paragraph]
 *
 *   Ironframe is built for that: …
 *
 *   We're opening a small Command Design Partner cohort: $4,999 …
 *
 *   If … workflow review … not a product tour.
 *
 *   Best, / Dereck / Founder, Ironframe / email
 *
 * Do NOT reopen the Touch 1 diagnostic. Queue-panel re-anchors stay HITL-only.
 * GA list price is Touch 2+ only — second short line under the cohort beat
 * (human-voice lint forbids stacking price+window+criteria+GA in one clause).
 */

import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_PATH_B_USD,
} from "@/lib/ironframeProductKnowledge/commercial";
import { C1_FOUNDER_EMAIL_SIGNATURE } from "@/app/lib/salesC1FounderSignature";

export type Touch2EmailProspect = {
  firstName: string;
  /** Short motion phrase for the economics criteria line only — not a Gate 2 open. */
  criteriaFocus: string;
};

function formatUsd(n: number): string {
  return n.toLocaleString("en-US");
}

function greetingName(raw: string): string {
  const part = String(raw ?? "").trim().split(/\s+/)[0] || "";
  if (!part || /^(ops|contact|info|admin|lead|unknown|team)$/i.test(part)) {
    return "Team";
  }
  return part;
}

function sanitizeCriteriaFocus(raw: string): string {
  const cleaned = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "client evidence";
}

/**
 * Canonical Touch 2 body — mirrors Touch 1 paragraph slots + C1 signature.
 */
export function buildTouch2EmailBody(prospect: Touch2EmailProspect): string {
  const name = greetingName(prospect.firstName);
  const criteriaFocus = sanitizeCriteriaFocus(prospect.criteriaFocus);
  const pathB = formatUsd(DESIGN_PARTNER_PATH_B_USD);
  const days = DESIGN_PARTNER_DEFAULT_WINDOW_DAYS;

  return [
    `Hi ${name},`,
    "",
    "Following up on this briefly: we're only taking 3–5 MSP/MSSP operators in this Command Design Partner cohort so we can build around how you work — not a generic roadmap.",
    "",
    "Ironframe is built for that: hard tenant walls, residual risk in whole cents, and exportable evidence — so leadership sees dollar exposure, not another color chart.",
    "",
    `We're opening a small Command Design Partner cohort: $${pathB} flat for a ${days}-day co-builder seat around 2–3 success criteria you set for keeping ${criteriaFocus} separate.`,
    "That's ahead of our planned GA at about $35,000/year.",
    "",
    "If that's on your radar this quarter, the next step is a 10–15 minute workflow review on your evidence path — not a product tour.",
    "",
    C1_FOUNDER_EMAIL_SIGNATURE,
  ].join("\n");
}

export function buildTouch2Subject(company: string, priorSubject?: string | null): string {
  const prior = String(priorSubject ?? "").trim();
  if (prior) {
    return prior.toLowerCase().startsWith("re:") ? prior : `Re: ${prior}`;
  }
  const label = String(company ?? "").trim() || "your team";
  return `Re: client-isolated evidence — ${label}`;
}
