import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_PATH_B_USD,
  PLANNED_GA_COMMAND_USD,
} from "@/lib/ironframeProductKnowledge/commercial";

export type C1DraftProspect = {
  company: string;
  fullName: string;
};

function formatUsd(n: number): string {
  return n.toLocaleString("en-US");
}

function greetingName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0] || "";
  if (!part || /^(ops|contact|info|admin|lead|unknown)$/i.test(part)) return "Team";
  return part;
}

/** C1-locked cold EMAIL — Command Design Partner only (no Path B), Option A hiring opener, founder sign-off. */
export function buildC1LockedEmailBody(prospect: C1DraftProspect): {
  subject: string;
  body: string;
} {
  const name = greetingName(prospect.fullName);
  const subject = `Command Design Partner — ${prospect.company}`;
  const body = [
    `Hi ${name},`,
    "",
    `Noticed ${prospect.company} is expanding its compliance / GRC team recently. Quick question: how does your team handle evidence and board reporting today — especially where heatmaps or spreadsheets are still feeding leadership?`,
    "",
    "Ironframe is a control-first GRC platform — quantified risk in whole cents, strict tenant isolation, and auditor-ready evidence — not heatmap theater or spreadsheet governance.",
    "",
    `We're currently opening a small Command Design Partner cohort ($${formatUsd(DESIGN_PARTNER_PATH_B_USD)} flat for a ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day co-builder seat, structured around 2–3 success criteria you set). Planned GA for Ironframe Command is ~$${formatUsd(PLANNED_GA_COMMAND_USD)}/year.`,
    "",
    "If that friction is real on your side, the next step is a 10–15 minute workflow review on evidence and board-report pain — zero product preview or sales pitch.",
    "",
    "Best,",
    "Dereck",
    "Founder, Ironframe",
  ].join("\n");
  return { subject, body };
}

export function buildC1LockedSmsBody(prospect: C1DraftProspect): {
  subject: string;
  body: string;
} {
  const name = greetingName(prospect.fullName);
  // ≤160 on wire: include Ironframe + STOP so sendOutboundSms does not double-brand.
  const body = `Hi ${name}, Dereck @ Ironframe. Opening design-partner seats for MSSPs replacing heatmaps w/ dollar risk. Open to a 10–15 min workflow review? Reply YES or STOP.`;
  return { subject: `SMS · ${prospect.company}`, body };
}

/**
 * Approvals SMS channel toggle / dry-run lock.
 * No Path B, no URLs, Ironframe + STOP present (avoids server double-prefix).
 */
export const C1_LOCKED_SMS_BODY_GENERIC =
  "Hi Team, Dereck @ Ironframe. Opening design-partner seats for MSSPs replacing heatmaps w/ dollar risk. Open to a 10–15 min workflow review? Reply YES or STOP.";
