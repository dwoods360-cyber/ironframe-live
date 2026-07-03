import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { resolveWorkspaceInvitationForRegistration } from "@/app/lib/auth/workspaceInvitationCore";
import {
  buildRegisterInvitationUrl,
  buildWorkspaceInviteLoginUrl,
} from "@/app/lib/server/workspaceInviteEmailDelivery";
import { operatorSupabaseAccountExists, shouldRedirectInviteToTenantHost } from "@/app/lib/server/workspaceInviteIngressRouting";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { tenantSlugFromHost, buildTenantLoginRedirectUrl } from "@/app/lib/tenantSubdomain";

import RegisterInvitationError from "./RegisterInvitationError";
import SecureRegistrationClient from "./SecureRegistrationClient";
import {
  lookupConsumedInviteTenantSlug,
  resolveConsumedWorkspaceInviteRedirect,
} from "@/app/lib/server/workspaceInvitationRecovery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace Activation | Ironframe",
  description: "Secure invite-only workspace activation for Ironframe GRC operators.",
};

interface RegisterPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SecureRegistrationPage({ params }: RegisterPageProps) {
  const { token } = await params;
  const trimmedToken = token?.trim();

  if (!trimmedToken) {
    notFound();
  }

  const lookup = await resolveWorkspaceInvitationForRegistration(trimmedToken).catch(() => ({
    ok: false as const,
    reason: "not_found" as const,
  }));

  if (!lookup.ok) {
    if (lookup.reason === "not_found") {
      notFound();
    }
    if (lookup.reason === "email_unbound") {
      return (
        <RegisterInvitationError
          title="Token missing operator email"
          detail="This invitation was minted without a bound email address. In admin onboarding, mint a new token with Bound email and Bound slug filled in, then open the full /register/{token} URL."
        />
      );
    }
    if (lookup.reason === "consumed") {
      const recovery = await resolveConsumedWorkspaceInviteRedirect(trimmedToken);
      if (recovery) {
        redirect(recovery.redirectTo);
      }
      const consumedTenantSlug = await lookupConsumedInviteTenantSlug(trimmedToken);
      return (
        <RegisterInvitationError
          title="Invitation already used"
          detail="This activation token was already consumed. Sign in at your workspace URL or ask your administrator to mint a new invitation."
          primaryAction={
            consumedTenantSlug
              ? {
                  href: buildTenantLoginRedirectUrl(consumedTenantSlug),
                  label: "Open workspace sign-in",
                }
              : undefined
          }
        />
      );
    }
    return (
      <RegisterInvitationError
        title="Invitation expired"
        detail="This activation token has expired. Mint a new token from admin onboarding (Step 0)."
      />
    );
  }

  const invitation = lookup.invitation;

  const h = await headers();
  const hostSlug = tenantSlugFromHost(h.get("host"));
  if (shouldRedirectInviteToTenantHost(hostSlug, invitation.tenantSlug)) {
    redirect(buildRegisterInvitationUrl(trimmedToken, invitation.tenantSlug));
  }

  if (await operatorSupabaseAccountExists(invitation.email)) {
    redirect(buildWorkspaceInviteLoginUrl(trimmedToken, invitation.tenantSlug ?? hostSlug));
  }

  if (invitation.tenantSlug) {
    const tenant = await lookupTenantBySlug(invitation.tenantSlug).catch(() => null);
    if (!tenant) {
      return (
        <RegisterInvitationError
          statusLabel="Activation paused"
          title={`Workspace "${invitation.tenantSlug}" is not provisioned yet`}
          detail={`Your invitation token is valid, but the workspace "${invitation.tenantSlug}" has not been created. Sign in as a platform administrator, open admin onboarding, and complete Step 1 — Provision tenant using slug "${invitation.tenantSlug}". Then return to this same activation URL in your browser.`}
          primaryAction={{
            href: "/admin/onboarding",
            label: "Open admin provisioning",
          }}
        />
      );
    }
  }

  return (
    <SecureRegistrationClient
      token={trimmedToken}
      targetEmail={invitation.email}
      tenantSlug={invitation.tenantSlug}
      expiresAt={invitation.expiresAt}
    />
  );
}
