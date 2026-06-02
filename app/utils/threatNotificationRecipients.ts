/**
 * Centralized threat / GRC notification recipient resolution (Epic 7).
 * Comma-separated `THREAT_CONFIRMATION_RECIPIENTS` — no hardcoded developer inboxes.
 */

export function getThreatConfirmationRecipients(): string[] {
  const raw = process.env.THREAT_CONFIRMATION_RECIPIENTS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getPrimaryThreatNotificationRecipient(): string | null {
  return getThreatConfirmationRecipients()[0] ?? null;
}

/** CC list for investigation emails (all configured recipients except primary `to`). */
export function getInvestigationEmailCcList(): string[] {
  const all = getThreatConfirmationRecipients();
  if (all.length <= 1) return [];
  return all.slice(1);
}
