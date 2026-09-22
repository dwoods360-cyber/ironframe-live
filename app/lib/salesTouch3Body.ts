/**
 * Touch 3 EMAIL body — Value Drop (send #3, ~day 10).
 *
 * Plain-English 3-point self-audit. No $4,999 / GA / workflow-review pitch.
 * Motion-specific checks from `salesTouchMotionCopy`.
 */

import { C1_FOUNDER_EMAIL_SIGNATURE } from "@/app/lib/salesC1FounderSignature";
import {
  classifySalesMotion,
  touch3AudienceFor,
  touch3ChecksFor,
  touch3SubjectFor,
  type SalesMotionKind,
} from "@/app/lib/salesTouchMotionCopy";

export type Touch3EmailProspect = {
  firstName: string;
  company: string;
  /** Free-text motion hints (deal title, friction, prior subject). */
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

/**
 * Canonical Touch 3 Value Drop body — three spoken checks + soft reply invite.
 */
export function buildTouch3EmailBody(prospect: Touch3EmailProspect): string {
  const name = greetingName(prospect.firstName);
  const company = String(prospect.company ?? "").trim() || "your team";
  const kind =
    prospect.kind ??
    classifySalesMotion(`${prospect.motion || ""} ${company}`);
  const audience = touch3AudienceFor(kind);
  const [c1, c2, c3] = touch3ChecksFor(kind);

  return [
    `Hi ${name},`,
    "",
    `For ${audience} juggling more than one client register, these three checks usually show whether evidence is actually isolated — no pitch, just the questions:`,
    "",
    `1. ${c1}`,
    `2. ${c2}`,
    `3. ${c3}`,
    "",
    `If any of those land awkwardly for ${company}, reply with which one — happy to compare notes.`,
    "",
    C1_FOUNDER_EMAIL_SIGNATURE,
  ].join("\n");
}

export function buildTouch3Subject(input: {
  company: string;
  touch1Subject?: string | null;
  motion?: string | null;
  kind?: SalesMotionKind;
}): string {
  const kind =
    input.kind ??
    classifySalesMotion(`${input.motion || ""} ${input.company}`);
  return touch3SubjectFor({
    touch1Subject: input.touch1Subject,
    company: input.company,
    kind,
  });
}

/** True when body looks like T1/T2 economics (must not DISPATCH as Touch 3). */
export function looksLikeTouchEconomicsBody(body: string): boolean {
  const t = String(body ?? "");
  return (
    /\$4,?999/i.test(t) ||
    /command\s+design\s+partner/i.test(t) ||
    /planned\s+GA|\$35,?000/i.test(t) ||
    /workflow\s*review/i.test(t)
  );
}

/** True when body has the Value Drop three-check shape. */
export function looksLikeTouch3ValueDropBody(body: string): boolean {
  const t = String(body ?? "");
  return (
    /no pitch,\s*just the questions/i.test(t) &&
    /\b1\.\s+/.test(t) &&
    /\b2\.\s+/.test(t) &&
    /\b3\.\s+/.test(t) &&
    !looksLikeTouchEconomicsBody(t)
  );
}
