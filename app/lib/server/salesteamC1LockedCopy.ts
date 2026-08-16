import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_PATH_B_USD,
} from "@/lib/ironframeProductKnowledge/commercial";
import { C1_FOUNDER_EMAIL_SIGNATURE } from "@/app/lib/salesC1FounderSignature";

export type C1DraftProspect = {
  company: string;
  fullName: string;
};

export {
  C1_FOUNDER_EMAIL_SIGNATURE,
  hasC1FounderEmailSignature,
} from "@/app/lib/salesC1FounderSignature";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US");
}

function greetingName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0] || "";
  if (!part || /^(ops|contact|info|admin|lead|unknown)$/i.test(part)) return "Team";
  return part;
}

/**
 * C1-locked cold EMAIL — Command Design Partner only (never Path B in body).
 * Beachhead D opener: multi-client isolation first (not invented hiring; heatmap amnesty is CISO/CFO lane).
 * Cold first touch: no planned GA list price (defer to Touch 2 / pricing questions).
 */
export function buildC1LockedEmailBody(prospect: C1DraftProspect): {
  subject: string;
  body: string;
} {
  const name = greetingName(prospect.fullName);
  const subject = `Multi-client GRC walls — ${prospect.company}`;
  const body = [
    `Hi ${name},`,
    "",
    `When ${prospect.company} runs compliance across client environments, how do you keep evidence and board reporting isolated today — without mixing registers in a shared GRC stack?`,
    "",
    "Ironframe is built for that: hard tenant walls, residual risk in whole cents, and exportable evidence — so leadership sees dollar exposure, not another color chart.",
    "",
    `We're opening a small Command Design Partner cohort: $${formatUsd(DESIGN_PARTNER_PATH_B_USD)} flat for a ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day co-builder seat around 2–3 success criteria you set.`,
    "",
    "If that multi-client friction is real, the next step is a 10–15 minute workflow review on your evidence path — not a product tour.",
    "",
    C1_FOUNDER_EMAIL_SIGNATURE,
  ].join("\n");
  return { subject, body };
}

export function buildC1LockedSmsBody(prospect: C1DraftProspect): {
  subject: string;
  body: string;
} {
  const name = greetingName(prospect.fullName);
  // ≤160 on wire: include Ironframe + STOP so sendOutboundSms does not double-brand.
  const body = `Hi ${name}, Dereck @ Ironframe. MSSP seats: client walls + dollar risk, not shared heatmaps. 10–15 min workflow review? Reply YES or STOP.`;
  return { subject: `SMS · ${prospect.company}`, body };
}

/**
 * Approvals SMS channel toggle / dry-run lock.
 * No Path B, no URLs, Ironframe + STOP present (avoids server double-prefix).
 */
export const C1_LOCKED_SMS_BODY_GENERIC =
  "Hi Team, Dereck @ Ironframe. MSSP seats: client walls + dollar risk, not shared heatmaps. 10–15 min workflow review? Reply YES or STOP.";
