import "server-only";

/** Fire-and-forget Slack/Discord webhook when exposure exceeds INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS. */
export async function dispatchInternalExposureAlert(payload: {
  tenantId: string;
  tenantSlug: string;
  companyName: string;
  currentExposureCents: string;
  thresholdCents: string;
  draftFilename: string;
  operationalDate: string;
}): Promise<void> {
  const url = process.env.INTERNAL_ALERT_WEBHOOK_URL?.trim();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "BRIEFING_EXPOSURE_THRESHOLD_EXCEEDED",
        text: `Urgent briefing review: ${payload.companyName} exposure ${payload.currentExposureCents} ¢ (threshold ${payload.thresholdCents} ¢). Draft \`${payload.draftFilename}\` awaiting promote-briefing-draft.ts.`,
        ...payload,
      }),
    });
  } catch (error) {
    console.error("[INTERNAL_ALERT_WEBHOOK] dispatch failed:", error);
  }
}
