/** Shared HITL DISPATCH guards — client disable + server 422. Never auto-send. */

import { hasC1FounderEmailSignature } from "@/app/lib/salesC1FounderSignature";
import { lintSalesHumanVoice } from "@/app/lib/salesHumanVoice";

export type ApprovalDispatchChannel = "EMAIL" | "SMS";

export const SALES_SMS_MAX_CHARS = 160;

/** Patterns that must not ride on SMS (peer lock + STOP policy). */
const SALES_SMS_BANNED: Array<{ re: RegExp; label: string }> = [
  { re: /https?:\/\//i, label: "URLs are not allowed in Sales SMS" },
  { re: /\bpath\s*b\b/i, label: "Path B must not appear in Sales SMS" },
  { re: /\/pricing\b/i, label: "/pricing must not appear in Sales SMS" },
  { re: /\bironframegrc\.com\b/i, label: "Domain links are not allowed in Sales SMS" },
];

/**
 * Companies on shortlist HOLD — never Path B cold DISPATCH.
 * Keep lowercase keys; match company name contains.
 */
/** Path B cold DISPATCH blocked until channel/competitor re-qualification. */
export const SALES_DISPATCH_HOLD_COMPANIES: readonly string[] = [
  "blueradius",
  "pivot point",
  "pivotpoint",
  "ultraviolet",
  "uv cyber",
  "uvcyber",
];

/**
 * Operator / dry-run inboxes — live partner DISPATCH must not use these unless acknowledged.
 * Extend via env OPERATOR_DRY_RUN_EMAILS=comma,separated
 */
export function operatorDryRunEmails(): string[] {
  const fromEnv = (process.env.OPERATOR_DRY_RUN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(
    new Set(["dwoods360@gmail.com", "dereck@ironframegrc.com", ...fromEnv]),
  );
}

function looksLikeEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

/** Lenient E.164-ish check (server still normalizes). */
function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, "");
  return /^\+?\d{10,15}$/.test(digits);
}

export function isIronleadsLocalEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@ironleads.local");
}

export function isSalesDispatchHoldCompany(company: string | null | undefined): boolean {
  const c = (company ?? "").trim().toLowerCase();
  if (!c) return false;
  return SALES_DISPATCH_HOLD_COMPANIES.some((hold) => c.includes(hold));
}

export function isOperatorDryRunEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return operatorDryRunEmails().includes(e);
}

/** Prefer SMS when EMAIL destination is a harvest placeholder. */
export function preferredSalesDispatchChannel(input: {
  email: string;
  phone: string | null | undefined;
  current: ApprovalDispatchChannel;
}): ApprovalDispatchChannel {
  if (isIronleadsLocalEmail(input.email) && looksLikePhone(String(input.phone ?? ""))) {
    return "SMS";
  }
  return input.current;
}

export type DispatchValidationInput = {
  draftKind: "SALES" | "SUPPORT" | "CUSTOMER_SUCCESS";
  channel: ApprovalDispatchChannel;
  body: string;
  recipientEmail: string;
  recipientPhone: string | null | undefined;
  /** Company on the draft — used for HOLD / competitor blocks. */
  company?: string | null;
  /**
   * Required when EMAIL To is an operator dry-run inbox.
   * UI checkbox: “Acknowledge dry-run to my inbox”.
   */
  acknowledgeOperatorSelfDispatch?: boolean;
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

  if (input.draftKind === "SALES" && isSalesDispatchHoldCompany(input.company)) {
    errors.push(
      "HOLD — this company is not a Path B cold DISPATCH target (shortlist channel/competitor). Purge or re-qualify first.",
    );
  }

  if (input.channel === "EMAIL") {
    if (!looksLikeEmail(input.recipientEmail)) {
      errors.push("Destination email is required for EMAIL DISPATCH.");
    } else if (isIronleadsLocalEmail(input.recipientEmail)) {
      errors.push(
        "EMAIL blocked — destination is @ironleads.local (harvest placeholder). Switch channel to SMS or replace with a real buyer email.",
      );
    } else if (
      input.draftKind === "SALES" &&
      isOperatorDryRunEmail(input.recipientEmail) &&
      !input.acknowledgeOperatorSelfDispatch
    ) {
      errors.push(
        "Destination is an operator dry-run inbox. Check “Acknowledge dry-run to my inbox” or set a real prospect email before live DISPATCH.",
      );
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

  if (input.draftKind === "SALES" && input.channel === "EMAIL" && body) {
    if (!/4,?999|\$4k|command\s+design\s+partner/i.test(body)) {
      errors.push("Sales EMAIL must mention $4,999 or Command Design Partner (C1 lock).");
    }
    if (!/workflow\s*review/i.test(body)) {
      errors.push("Sales EMAIL must include a workflow review CTA (C1 lock).");
    }
    if (/free\s*(trial|poc|pilot)|proof\s*of\s*concept/i.test(body)) {
      errors.push("Sales EMAIL must not offer a free pilot / PoC / trial.");
    }
    if (!hasC1FounderEmailSignature(body)) {
      errors.push(
        "Sales EMAIL must end with founder signature: Best, / Dereck / Founder, Ironframe / dereck@ironframegrc.com (C1 lock).",
      );
    }
    if (/ironframe\s+governance\s+frame/i.test(body)) {
      errors.push("Sales EMAIL must not use Governance Frame as the sales signature (C1 lock).");
    }
    const voice = lintSalesHumanVoice(body);
    if (!voice.ok) {
      for (const issue of voice.issues) {
        errors.push(`Human voice: ${issue.message}`);
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
  /** Server-minted AGREED handoff token (SoD baton). */
  handoff?: string;
}): string {
  const q = new URLSearchParams();
  if (input.name?.trim()) q.set("name", input.name.trim());
  if (input.email?.trim()) q.set("email", input.email.trim().toLowerCase());
  if (input.slug?.trim()) q.set("slug", input.slug.trim().toLowerCase());
  if (input.handoff?.trim()) q.set("handoff", input.handoff.trim());
  const qs = q.toString();
  return `/admin/onboarding${qs ? `?${qs}` : ""}#onboarding-controls`;
}
