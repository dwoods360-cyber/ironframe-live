/**
 * Commercial / GTM gates — Path B counsel, public instant checkout, booking URL.
 * Default-safe for design-partner motion (no freemium, no public Stripe bypass).
 */

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
 * Optional operator calendar / booking link for HITL inbound drafts
 * (Calendly, Google Appointment slots, etc.). Never auto-emailed — pasted into Approvals draft.
 */
export function resolveWorkflowReviewBookingUrl(): string | null {
  const url = process.env.IRONFRAME_WORKFLOW_REVIEW_BOOKING_URL?.trim();
  return url && /^https:\/\//i.test(url) ? url : null;
}

/** Operator SLA copy for inbound hand-raisers (hours). */
export const INBOUND_LEAD_REPLY_SLA_HOURS = 4 as const;
