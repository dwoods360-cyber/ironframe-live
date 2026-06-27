/**
 * Bucket A — pre-authentication invite email body (transactional / Resend or Supabase hand-off).
 * Keep plain text: no ASCII wireframes, tables, or post-login navigation in email HTML.
 */

import { formatLocalTenantWorkspaceUrl } from "@/app/lib/tenantSubdomain";

export type WorkspaceInviteEmailInput = {
  tenantDisplayName: string;
  tenantSlug: string;
  operatorEmail: string;
  workspaceUrl: string;
  initializeWorkspaceUrl: string;
  inviteExpiresAt: string;
  registrationMode?: string;
  platformVersion?: string;
  supportEmail?: string;
};

const DEFAULT_SUPPORT = "delivery@ironframegrc.com";
const DEFAULT_PLATFORM_VERSION = "v0.1.0-ga-epic17";

export function buildWorkspaceInviteEmailInput(input: {
  tenantDisplayName: string;
  tenantSlug: string;
  operatorEmail: string;
  initializeWorkspaceUrl: string;
  inviteExpiresAt: string;
  port?: number | string;
  supportEmail?: string;
  registrationMode?: string;
  platformVersion?: string;
}): WorkspaceInviteEmailInput {
  return {
    tenantDisplayName: input.tenantDisplayName,
    tenantSlug: input.tenantSlug,
    operatorEmail: input.operatorEmail.trim().toLowerCase(),
    workspaceUrl: formatLocalTenantWorkspaceUrl(input.tenantSlug, input.port),
    initializeWorkspaceUrl: input.initializeWorkspaceUrl,
    inviteExpiresAt: input.inviteExpiresAt,
    registrationMode: input.registrationMode ?? "ASSISTED",
    platformVersion: input.platformVersion ?? DEFAULT_PLATFORM_VERSION,
    supportEmail: input.supportEmail,
  };
}

function formatInviteExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function buildIngressSummaryBlock(input: WorkspaceInviteEmailInput): string[] {
  const expiresLabel = formatInviteExpiry(input.inviteExpiresAt);
  return [
    "SECURE INGRESS SUMMARY",
    `REGISTRATION_MODE: ${input.registrationMode ?? "ASSISTED"}`,
    `INVITE_TARGET: ${input.operatorEmail}`,
    `TENANT_SLUG: ${input.tenantSlug}`,
    `WORKSPACE: ${input.workspaceUrl}`,
    `INVITE_EXPIRES: ${expiresLabel}`,
    `PLATFORM_VERSION: ${input.platformVersion ?? DEFAULT_PLATFORM_VERSION}`,
    "PERIMETER_SHIELD_ACTIVE",
  ];
}

export function buildWorkspaceInviteEmailPlainText(input: WorkspaceInviteEmailInput): string {
  const support = input.supportEmail?.trim() || DEFAULT_SUPPORT;

  return [
    `Ironframe workspace invitation — ${input.tenantDisplayName}`,
    "",
    "Ironframe blocks public self-registration to protect infrastructure boundaries. Onboarding is invite-only through your sales or delivery team.",
    "",
    ...buildIngressSummaryBlock(input),
    "",
    "ACTIVATE YOUR WORKSPACE",
    `Open this secure link: ${input.initializeWorkspaceUrl}`,
    "",
    "Configure your credentials — choose a strong password. This binds your identity to your organization's compliance profile.",
    `You will land directly on your assigned workspace: ${input.workspaceUrl}`,
    "You will not need to manually select a tenant during your first login.",
    "",
    "Note on first login: Before you can view live corporate risk metrics or system dashboards, you will complete a one-time digital signature on your organization's Master Services Agreement (MSA) and Data Processing Addendum (DPA).",
    "",
    `If your invite email is delayed or expires, contact ${support} to safely resend the secure initialization link.`,
    "",
    "— Ironframe Delivery",
  ].join("\n");
}

export function buildWorkspaceInviteEmailHtml(input: WorkspaceInviteEmailInput): string {
  const support = input.supportEmail?.trim() || DEFAULT_SUPPORT;
  const expiresLabel = formatInviteExpiry(input.inviteExpiresAt);
  const text = buildWorkspaceInviteEmailPlainText(input);

  return `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a; max-width: 36rem;">
  <p style="font-size: 14px; color: #334155;">Ironframe blocks public self-registration. Onboarding is invite-only through your sales or delivery team.</p>
  <div style="margin: 20px 0; padding: 16px; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; font-family: ui-monospace, monospace; font-size: 12px; color: #334155;">
    <p style="margin: 0 0 8px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #6366f1;">Secure ingress summary</p>
    <p style="margin: 4px 0;"><strong>Registration mode:</strong> ${input.registrationMode ?? "ASSISTED"}</p>
    <p style="margin: 4px 0;"><strong>Invite target:</strong> ${input.operatorEmail}</p>
    <p style="margin: 4px 0;"><strong>Tenant slug:</strong> ${input.tenantSlug}</p>
    <p style="margin: 4px 0;"><strong>Workspace:</strong> ${input.workspaceUrl}</p>
    <p style="margin: 4px 0;"><strong>Invite expires:</strong> ${expiresLabel}</p>
    <p style="margin: 4px 0;"><strong>Platform:</strong> ${input.platformVersion ?? DEFAULT_PLATFORM_VERSION}</p>
    <p style="margin: 8px 0 0; color: #0891b2;">● Perimeter shield active</p>
  </div>
  <p style="margin: 24px 0;">
    <a href="${input.initializeWorkspaceUrl}" style="display: inline-block; min-height: 44px; line-height: 44px; padding: 0 20px; background: #0891b2; color: #020617; font-weight: 700; text-decoration: none; border-radius: 8px;">Activate Account Perimeter</a>
  </p>
  <p style="font-size: 14px; color: #334155;">Configure your credentials with a strong password. You will land on <strong>${input.workspaceUrl}</strong> and will not need to pick a tenant on first login.</p>
  <p style="font-size: 13px; color: #64748b; border-left: 3px solid #6366f1; padding-left: 12px;"><strong>Required on activation:</strong> You will attest to your organization's MSA and DPA before entering the workspace.</p>
  <p style="font-size: 13px; color: #64748b;">Invite delayed or expired? Contact <a href="mailto:${support}">${support}</a>.</p>
  <pre style="display: none;">${text.replace(/</g, "&lt;")}</pre>
</body>
</html>`;
}
