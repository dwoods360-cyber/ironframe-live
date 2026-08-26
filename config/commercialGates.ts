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
 * Operator + prospect-facing reply SLA for inbound hand-raisers.
 * Aligned with public Path B promise: 1 Central business day.
 * Clock: America/Chicago Mon–Fri 09:00–17:00, no weekends/US federal holidays.
 */
export const INBOUND_CENTRAL_BUSINESS_DAY_HOURS = 8 as const;
export const INBOUND_LEAD_REPLY_SLA_BUSINESS_DAYS = 1 as const;
/** Business-hours equivalent used for dueAt / elapsed math (1 day × 8h window). */
export const INBOUND_LEAD_REPLY_SLA_HOURS =
  (INBOUND_LEAD_REPLY_SLA_BUSINESS_DAYS * INBOUND_CENTRAL_BUSINESS_DAY_HOURS) as 8;
export const INBOUND_LEAD_REPLY_SLA_LABEL = "1 business day" as const;

/** T2 ops escalate at 75% of SLA (6 of 8 Central business hours) without HITL DISPATCH. */
export const INBOUND_SLA_T2_ESCALATE_MINUTES = 360 as const;

/** T3 prospect hold at full SLA (1 Central business day; env-gated autosend). */
export const INBOUND_SLA_T3_HOLD_MINUTES = 480 as const;

/** Accel mode: T2 wall-clock minutes (Sunday / QA without waiting a business day). */
export const INBOUND_SLA_TEST_ACCEL_T2_MINUTES = 2 as const;

/** Accel mode: T3 wall-clock minutes. */
export const INBOUND_SLA_TEST_ACCEL_T3_MINUTES = 3 as const;

export const INBOUND_SLA_WINDOW_COPY = INBOUND_SLA_WINDOW_LABEL;

/**
 * Short QA ladder — wall-clock T2/T3 (skips weekend/holiday pause).
 * Set IRONFRAME_INBOUND_SLA_TEST_ACCEL=1 only while testing; turn off after.
 */
export function isInboundSlaTestAccelEnabled(): boolean {
  const raw = process.env.IRONFRAME_INBOUND_SLA_TEST_ACCEL?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function resolveInboundSlaT2EscalateMinutes(): number {
  return isInboundSlaTestAccelEnabled()
    ? INBOUND_SLA_TEST_ACCEL_T2_MINUTES
    : INBOUND_SLA_T2_ESCALATE_MINUTES;
}

export function resolveInboundSlaT3HoldMinutes(): number {
  return isInboundSlaTestAccelEnabled()
    ? INBOUND_SLA_TEST_ACCEL_T3_MINUTES
    : INBOUND_SLA_T3_HOLD_MINUTES;
}

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

/**
 * Outreach-reply auto receipt (light ack) — on by default.
 * Set IRONFRAME_OUTREACH_REPLY_RECEIPT=0 to disable prospect email (founder alert may still fire).
 */
export function isOutreachReplyReceiptEnabled(): boolean {
  const raw = process.env.IRONFRAME_OUTREACH_REPLY_RECEIPT?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return true;
}

/**
 * Founder/ops alert when an outreach reply is registered — on by default.
 * Set IRONFRAME_OUTREACH_REPLY_ALERT=0 to disable.
 */
export function isOutreachReplyAlertEnabled(): boolean {
  const raw = process.env.IRONFRAME_OUTREACH_REPLY_ALERT?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return true;
}

/** On-page success copy after /register/contact submit. */
export function inboundLeadSuccessCopy(workflowReviewMinutes: string): string {
  return [
    `Thanks — we received your request. An Ironframe operator will contact you within ${INBOUND_LEAD_REPLY_SLA_LABEL}`,
    `(${INBOUND_SLA_WINDOW_COPY}) to schedule the ${workflowReviewMinutes}-minute workflow review.`,
    "No workspace was created.",
  ].join(" ");
}
