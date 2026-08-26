/**
 * Locked reply copy when a prospect answers cold outreach (Touch 1+).
 * HITL only — never auto-send. Distinct from inbound contact-form SLA copy.
 *
 * Canonical prose also lives in docs/sales/design-partner-outreach-sequence.md
 * (§ When they reply to outreach).
 */

import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";
import { resolveWorkflowReviewBookingUrl } from "@/config/commercialGates";

export type OutreachReplyKind = "YES" | "SOFT" | "PRICE";

export type OutreachReplyInput = {
  firstName: string;
  company: string;
  /** Optional one-line verified motion (isolation / board $ / evidence). */
  motionHint?: string | null;
  bookingUrl?: string | null;
};

export type OutreachReplyEmail = {
  kind: OutreachReplyKind;
  subject: string;
  text: string;
};

const C1_SIG = [
  "Best,",
  "Dereck",
  "Founder, Ironframe",
  "dereck@ironframegrc.com",
].join("\n");

function cleanName(raw: string, fallback: string): string {
  const n = String(raw || "").trim();
  return n.length >= 1 ? n.slice(0, 80) : fallback;
}

function scheduleLines(bookingUrl: string | null): string[] {
  if (bookingUrl) {
    return [
      `Prefer to pick a time: ${bookingUrl}`,
      "Or reply with 2–3 times that work this week in Central Time.",
    ];
  }
  return [
    "Reply with 2–3 times that work this week in Central Time (or YES and I’ll propose slots).",
  ];
}

function motionClause(motionHint: string | null | undefined, company: string): string {
  const m = String(motionHint || "").trim();
  if (m) {
    return `Glad the ${m} angle landed — that’s exactly what the ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review is for.`;
  }
  return `Glad this is useful for ${company}. The next step is a short workflow review on your evidence path — not a product tour.`;
}

/** YES / “let’s talk” / booking ask after cold outreach. */
export function buildOutreachYesReplyEmail(input: OutreachReplyInput): OutreachReplyEmail {
  const firstName = cleanName(input.firstName, "there");
  const company = cleanName(input.company, "your team");
  const bookingUrl =
    input.bookingUrl !== undefined
      ? input.bookingUrl
      : resolveWorkflowReviewBookingUrl();

  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for the reply — good to hear from you.",
    "",
    motionClause(input.motionHint, company),
    "",
    `It’s peer-to-peer, ${WORKFLOW_REVIEW_CTA_MINUTES} minutes, on one real friction (client isolation, board dollars, or exportable evidence).`,
    "",
    "If we align after that, the Command Design Partner seat is $4,999 flat for a 90-day window around 2–3 criteria you set.",
    "",
    ...scheduleLines(bookingUrl),
    "",
    C1_SIG,
  ].join("\n");

  return {
    kind: "YES",
    subject: `Re: workflow review — ${company}`,
    text,
  };
}

/** Soft “send more” / “curious” without a clear YES. */
export function buildOutreachSoftReplyEmail(input: OutreachReplyInput): OutreachReplyEmail {
  const firstName = cleanName(input.firstName, "there");
  const company = cleanName(input.company, "your team");
  const bookingUrl =
    input.bookingUrl !== undefined
      ? input.bookingUrl
      : resolveWorkflowReviewBookingUrl();

  const text = [
    `Hi ${firstName},`,
    "",
    "Appreciate you getting back.",
    "",
    `Happy to keep this concrete for ${company}: one ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review on how you keep client evidence isolated (or board exposure defended) today — not a demo deck.`,
    "",
    "If that friction is real, the paid Command Design Partner seat is $4,999 for a 90-day convert-or-exit window.",
    "",
    ...scheduleLines(bookingUrl),
    "",
    C1_SIG,
  ].join("\n");

  return {
    kind: "SOFT",
    subject: `Re: co-builder seat — ${company}`,
    text,
  };
}

/** Price / “what’s included” question before booking. */
export function buildOutreachPriceReplyEmail(input: OutreachReplyInput): OutreachReplyEmail {
  const firstName = cleanName(input.firstName, "there");
  const company = cleanName(input.company, "your team");
  const bookingUrl =
    input.bookingUrl !== undefined
      ? input.bookingUrl
      : resolveWorkflowReviewBookingUrl();

  const text = [
    `Hi ${firstName},`,
    "",
    "Quick economics, then we can schedule:",
    "",
    "Command Design Partner is $4,999 flat for a 90-day co-builder window.",
    "You name 2–3 success criteria. Convert or exit at day 90.",
    "Planned GA for Ironframe Command is about $35,000 a year.",
    "If you convert in-window, the $4,999 is credited to year-1 Command — not a negotiated discount.",
    "",
    `Best next step for ${company} is still a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review — peer diligence, not a tour.`,
    "",
    ...scheduleLines(bookingUrl),
    "",
    C1_SIG,
  ].join("\n");

  return {
    kind: "PRICE",
    subject: `Re: Command Design Partner — ${company}`,
    text,
  };
}

export function buildOutreachReplyEmail(
  kind: OutreachReplyKind,
  input: OutreachReplyInput,
): OutreachReplyEmail {
  switch (kind) {
    case "YES":
      return buildOutreachYesReplyEmail(input);
    case "SOFT":
      return buildOutreachSoftReplyEmail(input);
    case "PRICE":
      return buildOutreachPriceReplyEmail(input);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
