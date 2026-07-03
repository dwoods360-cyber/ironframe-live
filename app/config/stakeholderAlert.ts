/**
 * Client-safe label for stakeholder alert terminal logs.
 * Actual delivery uses server-side THREAT_CONFIRMATION_RECIPIENTS.
 */
export const STAKEHOLDER_ALERT_RECIPIENT_LABEL =
  process.env.NEXT_PUBLIC_THREAT_CONFIRMATION_PRIMARY?.trim() || "THREAT_CONFIRMATION_RECIPIENTS";
