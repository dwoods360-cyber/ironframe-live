/**
 * Touch 4 EMAIL body — Clean Breakup (send #4, final for this cohort).
 *
 * Short close. No guilt, no $4,999 / GA / workflow-review restack.
 * Reopen later is allowed on a new buyer, a new cohort, or a documented trigger.
 */

import { C1_FOUNDER_EMAIL_SIGNATURE } from "@/app/lib/salesC1FounderSignature";
import {
  breakupPriorityFor,
  classifySalesMotion,
  type SalesMotionKind,
} from "@/app/lib/salesTouchMotionCopy";
import { looksLikeTouchEconomicsBody } from "@/app/lib/salesTouch3Body";

export type Touch4EmailProspect = {
  firstName: string;
  company: string;
  motion?: string | null;
  kind?: SalesMotionKind;
};

function greetingName(raw: string): string {
  const part = String(raw ?? "").trim().split(/\s+/)[0] || "";
  if (!part || /^(ops|contact|info|admin|lead|unknown|team)$/i.test(part)) {
    return "Team";
  }
  return part;
}

export function buildTouch4EmailBody(prospect: Touch4EmailProspect): string {
  const name = greetingName(prospect.firstName);
  const company = String(prospect.company ?? "").trim() || "your team";
  const kind =
    prospect.kind ?? classifySalesMotion(`${prospect.motion || ""} ${company}`);
  const priority = breakupPriorityFor({ company, motion: prospect.motion, kind });

  return [
    `Hi ${name},`,
    "",
    `Assuming ${priority}, I'll close your file on this Design Partner thread and step back — no further follow-ups from me on this cohort.`,
    "",
    "If this comes back up later, or you want a second set of eyes on how you keep clients separated, just reply.",
    "",
    "Best of luck with the quarter.",
    "",
    C1_FOUNDER_EMAIL_SIGNATURE,
  ].join("\n");
}

export function buildTouch4Subject(input: {
  company: string;
  priorSubject?: string | null;
}): string {
  const prior = String(input.priorSubject ?? "").trim();
  if (prior) return /^Re:/i.test(prior) ? prior : `Re: ${prior}`;
  const label = String(input.company ?? "").trim() || "your team";
  return `Re: closing the file — ${label}`;
}

/** True when the body is the Clean Breakup, not a Touch 1–3 pitch. */
export function looksLikeTouch4BreakupBody(body: string): boolean {
  const t = String(body ?? "");
  return (
    /close your file on this Design Partner thread/i.test(t) &&
    /step back/i.test(t) &&
    /no further follow-ups/i.test(t) &&
    /just reply/i.test(t) &&
    !looksLikeTouchEconomicsBody(t)
  );
}
