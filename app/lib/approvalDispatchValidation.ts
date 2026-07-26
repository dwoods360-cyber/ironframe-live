/** Shared HITL DISPATCH guards — client disable + server 422. Never auto-send. */

export type ApprovalDispatchChannel = "EMAIL" | "SMS";

export const SALES_SMS_MAX_CHARS = 160;

/** Patterns that must not ride on SMS (peer lock + STOP policy). */
const SALES_SMS_BANNED: Array<{ re: RegExp; label: string }> = [
  { re: /https?:\/\//i, label: "URLs are not allowed in Sales SMS" },
  { re: /\bpath\s*b\b/i, label: "Path B must not appear in Sales SMS" },
  { re: /\/pricing\b/i, label: "/pricing must not appear in Sales SMS" },
  { re: /\bironframegrc\.com\b/i, label: "Domain links are not allowed in Sales SMS" },
];

function looksLikeEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

/** Lenient E.164-ish check (server still normalizes). */
function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, "");
  return /^\+?\d{10,15}$/.test(digits);
}

export type DispatchValidationInput = {
  draftKind: "SALES" | "SUPPORT" | "CUSTOMER_SUCCESS";
  channel: ApprovalDispatchChannel;
  body: string;
  recipientEmail: string;
  recipientPhone: string | null | undefined;
};

export type DispatchValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: string[] };

export function validateApprovalDispatch(
  input: DispatchValidationInput,
): DispatchValidationResult {
  const errors: string[] = [];
  const body = String(input.body ?? "").trim();
  if (!body) {
    errors.push("Proposed outreach / reply cannot be empty.");
  }

  if (input.channel === "EMAIL") {
    if (!looksLikeEmail(input.recipientEmail)) {
      errors.push("Destination email is required for EMAIL DISPATCH.");
    }
  }

  if (input.channel === "SMS") {
    if (!looksLikePhone(String(input.recipientPhone ?? ""))) {
      errors.push("Destination phone (E.164) is required for SMS DISPATCH.");
    }
    if (input.draftKind === "SALES") {
      if (body.length > SALES_SMS_MAX_CHARS) {
        errors.push(
          `Sales SMS must be ≤${SALES_SMS_MAX_CHARS} characters (now ${body.length}).`,
        );
      }
      for (const ban of SALES_SMS_BANNED) {
        if (ban.re.test(body)) errors.push(ban.label);
      }
    }
  }

  return errors.length === 0
    ? { ok: true, errors: [] }
    : { ok: false, errors };
}

/** Admin onboarding deep-link after order-form AGREED. */
export function adminOnboardingProvisionHref(input: {
  name?: string;
  email?: string;
  slug?: string;
}): string {
  const q = new URLSearchParams();
  if (input.name?.trim()) q.set("name", input.name.trim());
  if (input.email?.trim()) q.set("email", input.email.trim().toLowerCase());
  if (input.slug?.trim()) q.set("slug", input.slug.trim().toLowerCase());
  const qs = q.toString();
  return `/admin/onboarding${qs ? `?${qs}` : ""}#onboarding-controls`;
}
