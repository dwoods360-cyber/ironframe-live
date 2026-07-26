/**
 * Commercial / GTM gates — Path B counsel, public instant checkout, booking URL, inbound SLA.
 * Default-safe for design-partner motion (no freemium, no public Stripe bypass).
 */

import { INBOUND_SLA_WINDOW_LABEL } from "@/lib/gtm/inboundBusinessHours";

/** Counsel D0: Path B signature / send allowed only when explicitly approved. */
export function isCounselPathBSendApproved(): boolean {
  const raw = (
    process.env.NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED?.trim() ||
    process.env.IRONFRAME_COUNSEL_D0_APPROVED?.trim() ||
    ""
  ).toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Public generic Stripe Payment Link / instant provision webhook.
 * Off by default — PENDING partners use tenant-scoped Path B only.
 */
export function isPublicInstantCheckoutEnabled(): boolean {
  const raw = process.env.IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Optional operator calendar / booking link for HITL inbound drafts + T1/T3 backup emails
 * (Calendly, Google Appointment slots, etc.).
 */
export function resolveWorkflowReviewBookingUrl(): string | null {
  const url = process.env.IRONFRAME_WORKFLOW_REVIEW_BOOKING_URL?.trim();
  return url && /^https:\/\//i.test(url) ? url : null;
}

/**
 * Operator + prospect-facing reply SLA (business hours) for inbound hand-raisers.
 * Research: InsideSales/MIT — ≤5 min is peak conversion (21× vs 30 min);
 * HBR — ≤1 hour is ~7× more likely to qualify than waiting longer.
 * Clock: America/Chicago Mon–Fri 09:00–17:00, no weekends/US federal holidays.
 */
export const INBOUND_LEAD_REPLY_SLA_HOURS = 1 as const;

/** T2 ops escalate after this much Central business time without HITL DISPATCH. */
export const INBOUND_SLA_T2_ESCALATE_MINUTES = 45 as const;

/** T3 prospect hold after this much Central business time (env-gated autosend). */
export const INBOUND_SLA_T3_HOLD_MINUTES = 60 as const;

export const INBOUND_SLA_WINDOW_COPY = INBOUND_SLA_WINDOW_LABEL;

/**
 * T1 instant prospect ack — on by default (set IRONFRAME_INBOUND_SLA_T1_ACK=0 to disable).
 */
export function isInboundSlaT1AckEnabled(): boolean {
  const raw = process.env.IRONFRAME_INBOUND_SLA_T1_ACK?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return true;
}

/**
 * T3 automated SLA-hold email to prospect — off by default.
 * Set IRONFRAME_INBOUND_SLA_AUTOSEND=true to enable.
 */
export function isInboundSlaT3AutosendEnabled(): boolean {
  const raw = process.env.IRONFRAME_INBOUND_SLA_AUTOSEND?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** On-page success copy after /register/contact submit. */
export function inboundLeadSuccessCopy(workflowReviewMinutes: string): string {
  return [
    "Thanks — we received your request. An Ironframe operator will contact you within 1 business hour",
    `(${INBOUND_SLA_WINDOW_COPY}) to schedule the ${workflowReviewMinutes}-minute workflow review.`,
    "Outside those hours, expect a reply the next business day. No workspace was created.",
  ].join(" ");
}
