import {
  INBOUND_LEAD_REPLY_SLA_LABEL,
  INBOUND_SLA_WINDOW_COPY,
} from "@/config/commercialGates";
import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";

export function buildInboundT1AckEmail(input: {
  orgName: string;
  bookingUrl: string | null;
}): { subject: string; text: string } {
  const lines = [
    `Hi — thanks for requesting a ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review with Ironframe for ${input.orgName}.`,
    "",
    `An operator will reply within ${INBOUND_LEAD_REPLY_SLA_LABEL} (${INBOUND_SLA_WINDOW_COPY}) to schedule. This is a peer review on evidence / board-report friction — not a product demo.`,
  ];
  if (input.bookingUrl) {
    lines.push("", `Prefer to pick a time now: ${input.bookingUrl}`);
  }
  lines.push("", "No workspace was created by this request.", "", "— Ironframe GTM");
  return {
    subject: "We received your Ironframe workflow review request",
    text: lines.join("\n"),
  };
}

export function buildInboundT3HoldEmail(input: {
  orgName: string;
  bookingUrl: string | null;
}): { subject: string; text: string } {
  const schedule = input.bookingUrl
    ? `Book a slot here and we'll confirm: ${input.bookingUrl}`
    : "Reply with 2–3 times that work this week (Central Time), or reply YES and we'll propose slots.";
  return {
    subject: "Scheduling your Ironframe workflow review",
    text: [
      `Hi — we're still lining up an operator for your workflow review request (${input.orgName}).`,
      "",
      schedule,
      "",
      "Sorry for the delay — a human will still follow up.",
      "",
      "— Ironframe GTM (automated hold message)",
    ].join("\n"),
  };
}
