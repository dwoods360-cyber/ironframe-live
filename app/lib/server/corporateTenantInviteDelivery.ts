import "server-only";

export const INVITE_PENDING_SUCCESS_MESSAGE =
  "Tenant and billing initialized. Email notification queued.";

/** Supabase / SMTP delivery faults that must not roll back tenant + billing provision. */
export function isSupabaseInviteDeliveryDeferrable(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error ?? "");
  return /email rate limit|rate limit exceeded|over_email_send_rate_limit|too many requests|\b429\b|smtp|mail delivery|email send/i.test(
    message,
  );
}
