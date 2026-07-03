/**
 * Onboarding content buckets — strict separation of pre-auth (email) vs post-auth (app).
 * Legal agent review should cover Bucket A + activation surfaces before GA.
 */

export const ONBOARDING_BUCKET_A_TOPICS = [
  "invite-only ingress explanation",
  "initialize workspace CTA and secure link",
  "credential binding and password setup",
  "assigned workspace subdomain URL",
  "msa-dpa one-line pre-login warning",
  "invite delay and resend escalation",
] as const;

export const ONBOARDING_BUCKET_B_TOPICS = [
  "command post layout wireframe",
  "primary control areas index",
  "get-started checklist progression",
  "integrity hub and training tracks",
  "related manual cross-links",
] as const;

/** Pre-auth phrases that must not appear in post-auth operator surfaces. */
export const PRE_AUTH_COPY_MARKERS = [
  "locate your welcome message",
  "check your corporate inbox",
  "click the button labeled initialize workspace",
  "if your invite email is delayed",
  "process your corporate invitation",
] as const;

export function containsPreAuthOnboardingCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return PRE_AUTH_COPY_MARKERS.some((marker) => lower.includes(marker));
}

/** Fail closed when Bucket A invite copy leaks into post-auth operator markdown. */
export function assertOperatorPostAuthMarkdown(markdown: string, label = "operator markdown"): void {
  if (containsPreAuthOnboardingCopy(markdown)) {
    throw new Error(`${label} contains pre-auth onboarding copy (Bucket A leak).`);
  }
}
