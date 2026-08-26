/**
 * Light auto-receipt when a prospect replies to Path B outreach.
 * Not the YES/SOFT/PRICE HITL body — no $4,999 / Path B / scheduling hard-sell.
 */

import {
  INBOUND_LEAD_REPLY_SLA_LABEL,
  INBOUND_SLA_WINDOW_COPY,
} from "@/config/commercialGates";
import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";

export function buildOutreachReplyReceiptEmail(input: {
  firstName?: string | null;
  company?: string | null;
  bookingUrl?: string | null;
}): { subject: string; text: string } {
  const first = String(input.firstName || "").trim() || "there";
  const company = String(input.company || "").trim();
  const forCompany = company ? ` for ${company}` : "";

  const lines = [
    `Hi ${first},`,
    "",
    `Thanks for the reply — we received your note${forCompany}.`,
    "",
    `An Ironframe operator will follow up within ${INBOUND_LEAD_REPLY_SLA_LABEL} (${INBOUND_SLA_WINDOW_COPY}) to schedule a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review — peer diligence on evidence / board-report friction, not a product demo.`,
  ];
  if (input.bookingUrl) {
    lines.push("", `Prefer to pick a time now: ${input.bookingUrl}`);
  }
  lines.push(
    "",
    "This is an automated receipt only. A human will still reply on this thread.",
    "",
    "— Ironframe GTM",
  );

  return {
    subject: company
      ? `We received your reply — ${company}`
      : "We received your reply — Ironframe",
    text: lines.join("\n"),
  };
}
