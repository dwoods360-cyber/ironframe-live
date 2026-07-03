import "server-only";

import { Resend } from "resend";

import { resolveLocalDevAppPort, resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { buildTenantSubdomainOrigin } from "@/app/lib/tenantSubdomain";
import {
  buildWorkspaceInviteEmailHtml,
  buildWorkspaceInviteEmailInput,
  buildWorkspaceInviteEmailPlainText,
} from "@/app/lib/onboarding/workspaceInviteEmailContent";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { isSupabaseInviteDeliveryDeferrable } from "@/app/lib/server/corporateTenantInviteDelivery";

const DEFAULT_FROM_EMAIL = "delivery@ironframegrc.com";
const DEFAULT_FROM_NAME = "Ironframe Delivery";
/** Resend sandbox sender — works without custom domain verification (dev / fallback). */
const RESEND_SANDBOX_FROM_EMAIL = "onboarding@resend.dev";

/** Primary assisted path: tenant login with invite token (existing operators). */
export function buildWorkspaceInviteLoginUrl(token: string, tenantSlug?: string | null): string {
  const encoded = encodeURIComponent(token.trim());
  const slug = tenantSlug?.trim().toLowerCase();
  const base = slug
    ? buildTenantSubdomainOrigin(slug, resolveLocalDevAppPort()).replace(/\/+$/, "")
    : resolvePublicAppUrl().replace(/\/+$/, "");
  return `${base}/login?invite=${encoded}`;
}

/** First-time operators: password + MSA/DPA on the tenant host. */
export function buildRegisterInvitationUrl(token: string, tenantSlug?: string | null): string {
  const encoded = encodeURIComponent(token.trim());
  const slug = tenantSlug?.trim().toLowerCase();
  const base = slug
    ? buildTenantSubdomainOrigin(slug, resolveLocalDevAppPort()).replace(/\/+$/, "")
    : resolvePublicAppUrl().replace(/\/+$/, "");
  return `${base}/register/${encoded}`;
}

export function resolveWorkspaceInviteFromAddress(fromEmailOverride?: string): string {
  const name =
    process.env.WORKSPACE_INVITE_FROM_NAME?.trim() ||
    process.env.IRONCAST_FROM_NAME?.trim() ||
    DEFAULT_FROM_NAME;
  const email =
    fromEmailOverride?.trim() ||
    process.env.WORKSPACE_INVITE_FROM_EMAIL?.trim() ||
    process.env.IRONCAST_FROM_EMAIL?.trim() ||
    DEFAULT_FROM_EMAIL;
  return `${name} <${email}>`;
}

function resolveWorkspaceInviteSandboxFromAddress(): string {
  const name =
    process.env.WORKSPACE_INVITE_FROM_NAME?.trim() ||
    process.env.IRONCAST_FROM_NAME?.trim() ||
    DEFAULT_FROM_NAME;
  const email =
    process.env.WORKSPACE_INVITE_DEV_FROM_EMAIL?.trim() || RESEND_SANDBOX_FROM_EMAIL;
  return `${name} <${email}>`;
}

export type SendWorkspaceInviteEmailInput = {
  email: string;
  tenantSlug: string;
  registerToken: string;
  tenantDisplayName?: string | null;
  inviteExpiresAt: string;
};

export type WorkspaceInviteDeliveryChannel = "resend" | "dev-browser-handoff";

export type SendWorkspaceInviteEmailResult =
  | { ok: true; resendId?: string; deliveryChannel: WorkspaceInviteDeliveryChannel }
  | { ok: false; error: string; deferrable?: boolean };

export type WorkspaceInviteEmailDeliverySummary = {
  sent: boolean;
  deliveryChannel?: WorkspaceInviteDeliveryChannel;
  error?: string;
};

/** Maps Resend / dev-handoff results for admin UI — handoff is not an inbox delivery. */
export function summarizeWorkspaceInviteEmailDelivery(
  result: SendWorkspaceInviteEmailResult,
): WorkspaceInviteEmailDeliverySummary {
  if (!result.ok) {
    return { sent: false, error: result.error };
  }
  if (result.deliveryChannel === "dev-browser-handoff") {
    return {
      sent: false,
      deliveryChannel: result.deliveryChannel,
      error:
        "Local dev — email not sent. Resend sandbox only delivers to the account owner until a domain is verified. Copy the activation link below.",
    };
  }
  return { sent: true, deliveryChannel: result.deliveryChannel };
}

/** Local/dev only: open `/register/{token}` when Resend is not configured at all. */
export function isDevBrowserInviteHandoffEnabled(): boolean {
  if (process.env.IRONFRAME_DISABLE_DEV_INVITE_HANDOFF?.trim() === "1") return false;
  if (process.env.IRONFRAME_FORCE_DEV_INVITE_HANDOFF?.trim() === "1") return true;
  if (process.env.IRONFRAME_ALLOW_DEV_INVITE_HANDOFF?.trim() === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/** Opt-in only: Resend sandbox cannot deliver to arbitrary operator inboxes. */
export function isWorkspaceInviteSandboxFallbackEnabled(): boolean {
  return process.env.WORKSPACE_INVITE_ALLOW_SANDBOX_FALLBACK?.trim() === "1";
}

/** Resend accepts the API key but rejects unverified custom From domains. */
export function isResendSenderDomainVerificationError(message: string): boolean {
  return /domain is not verified|verify your domain|domain verification/i.test(message);
}

/** Resend sandbox (`onboarding@resend.dev`) only delivers to the account owner's email. */
export function isResendSandboxRecipientRestrictionError(message: string): boolean {
  return /only send testing emails to your own email|send emails to other recipients/i.test(
    message,
  );
}

function devBrowserInviteHandoffResult(
  registerToken: string,
  tenantSlug: string,
  reason: string,
): SendWorkspaceInviteEmailResult {
  const initializeWorkspaceUrl = buildWorkspaceInviteLoginUrl(registerToken, tenantSlug);
  console.info(`[workspace-invite] ${reason} — dev browser handoff → ${initializeWorkspaceUrl}`);
  return { ok: true, deliveryChannel: "dev-browser-handoff" };
}

type ResendInvitePayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

async function dispatchResendInvite(
  resend: Resend,
  payload: ResendInvitePayload,
  timeoutMs = 15_000,
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  try {
    const result = await Promise.race([
      resend.emails.send(payload),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Resend API timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
    const { data, error } = result;
    return {
      data: data?.id ? { id: data.id } : null,
      error: error ? { message: error.message || "Resend rejected the workspace invite payload." } : null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Resend invite dispatch failed.";
    return { data: null, error: { message } };
  }
}

export async function sendWorkspaceInviteEmailCore(
  input: SendWorkspaceInviteEmailInput,
): Promise<SendWorkspaceInviteEmailResult> {
  const email = input.email.trim().toLowerCase();
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  if (!email || !tenantSlug) {
    return { ok: false, error: "Email and tenant slug are required to dispatch Bucket A invite." };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (isDevBrowserInviteHandoffEnabled()) {
      return devBrowserInviteHandoffResult(input.registerToken, tenantSlug, "RESEND_API_KEY absent");
    }
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured. Set RESEND_API_KEY or run in local development.",
      deferrable: true,
    };
  }

  const tenant = await lookupTenantBySlug(tenantSlug);
  const tenantDisplayName = input.tenantDisplayName?.trim() || tenant?.name || tenantSlug;
  const initializeWorkspaceUrl = buildWorkspaceInviteLoginUrl(input.registerToken, tenantSlug);
  const emailContent = buildWorkspaceInviteEmailInput({
    tenantDisplayName,
    tenantSlug,
    operatorEmail: email,
    initializeWorkspaceUrl,
    inviteExpiresAt: input.inviteExpiresAt,
    port: resolveLocalDevAppPort(),
  });

  const payload: ResendInvitePayload = {
    from: resolveWorkspaceInviteFromAddress(),
    to: [email],
    subject: `Ironframe workspace invitation — ${tenantDisplayName}`,
    html: buildWorkspaceInviteEmailHtml(emailContent),
    text: buildWorkspaceInviteEmailPlainText(emailContent),
  };

  try {
    const resend = new Resend(apiKey);
    let { data, error } = await dispatchResendInvite(resend, payload);

    if (
      error &&
      isResendSenderDomainVerificationError(error.message) &&
      !payload.from.includes(RESEND_SANDBOX_FROM_EMAIL) &&
      isWorkspaceInviteSandboxFallbackEnabled()
    ) {
      const sandboxFrom = resolveWorkspaceInviteSandboxFromAddress();
      console.warn(
        `[workspace-invite] Custom From domain rejected (${error.message}). Retrying with ${sandboxFrom} (WORKSPACE_INVITE_ALLOW_SANDBOX_FALLBACK=1).`,
      );
      ({ data, error } = await dispatchResendInvite(resend, { ...payload, from: sandboxFrom }));
    }

    if (error) {
      if (isResendSenderDomainVerificationError(error.message)) {
        return {
          ok: false,
          error: `${error.message} Production invite mail requires a verified sending domain. Register ironframegrc.com at https://resend.com/domains (or run: node scripts/dev/register-resend-domain.mjs ironframegrc.com). WORKSPACE_INVITE_FROM_EMAIL must use that domain.`,
          deferrable: true,
        };
      }
      const sandboxRecipientBlocked = isResendSandboxRecipientRestrictionError(error.message);
      if (
        isDevBrowserInviteHandoffEnabled() &&
        (/timed out/i.test(error.message) || sandboxRecipientBlocked)
      ) {
        const reason = sandboxRecipientBlocked
          ? "Resend sandbox can only email the account owner until a domain is verified"
          : error.message;
        console.warn(`[workspace-invite] ${reason} — dev browser handoff`);
        return devBrowserInviteHandoffResult(input.registerToken, tenantSlug, reason);
      }
      return {
        ok: false,
        error: error.message,
        deferrable: isSupabaseInviteDeliveryDeferrable(error.message),
      };
    }

    return { ok: true, resendId: data?.id, deliveryChannel: "resend" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Workspace invite email dispatch failed.";
    return {
      ok: false,
      error: message,
      deferrable: isSupabaseInviteDeliveryDeferrable(e),
    };
  }
}
