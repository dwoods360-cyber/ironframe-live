import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveWorkspaceInvitationForRegistration } from "@/app/lib/auth/workspaceInvitationCore";
import { buildRegisterInvitationUrl } from "@/app/lib/server/workspaceInviteEmailDelivery";
import { completeWorkspaceInviteLoginCore } from "@/app/lib/server/workspaceInviteLoginCore";
import { operatorSupabaseAccountExists, shouldRedirectInviteToTenantHost } from "@/app/lib/server/workspaceInviteIngressRouting";
import { resolveConsumedWorkspaceInviteRedirect } from "@/app/lib/server/workspaceInvitationRecovery";
import { resolveTenantBrand } from "@/app/lib/brand/resolveTenantBrand";
import { buildTenantLoginRedirectUrl, tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import LoginClient from "./LoginClient";
export const dynamic = "force-dynamic";

type InviteLookupState =
  | {
      ok: true;
      inviteToken: string;
      inviteEmail: string;
      firstTimeRegisterUrl: string;
      activationMode: "existing-account" | "new-account";
    }
  | {
      ok: false;
      inviteError: string;
    };

function inviteErrorMessage(reason: "not_found" | "email_unbound" | "consumed" | "expired"): string {
  switch (reason) {
    case "consumed":
      return "This invitation has already been used. Sign in with your existing credentials.";
    case "expired":
      return "This invitation has expired. Contact your administrator for a new invite.";
    case "email_unbound":
      return "This invitation is not bound to an operator email. Contact your administrator.";
    default:
      return "Invitation token not recognized.";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = params.invite?.trim() ?? "";

  const h = await headers();
  const hostSlug = tenantSlugFromHost(h.get("host"));
  const initialBrand = hostSlug ? await resolveTenantBrand(hostSlug) : null;

  let inviteState: InviteLookupState | null = null;
  let inviteTenantSlug: string | null = hostSlug;

  if (inviteToken) {
    const lookup = await resolveWorkspaceInvitationForRegistration(inviteToken).catch(() => ({
      ok: false as const,
      reason: "not_found" as const,
    }));

    if (!lookup.ok) {
      if (lookup.reason === "consumed") {
        const recovery = await resolveConsumedWorkspaceInviteRedirect(inviteToken);
        if (recovery) {
          redirect(recovery.redirectTo);
        }
      }
      inviteState = { ok: false, inviteError: inviteErrorMessage(lookup.reason) };
    } else {
      const expectedSlug = lookup.invitation.tenantSlug;
      inviteTenantSlug = expectedSlug ?? hostSlug;
      if (shouldRedirectInviteToTenantHost(hostSlug, expectedSlug)) {
        redirect(
          `${buildTenantLoginRedirectUrl(expectedSlug!)}?invite=${encodeURIComponent(inviteToken)}`,
        );
      }

      const registerUrl = buildRegisterInvitationUrl(
        inviteToken,
        expectedSlug ?? hostSlug,
      );
      const hasExistingAccount = await operatorSupabaseAccountExists(lookup.invitation.email);
      if (!hasExistingAccount) {
        redirect(registerUrl);
      }

      inviteState = {
        ok: true,
        inviteToken,
        inviteEmail: lookup.invitation.email,
        firstTimeRegisterUrl: registerUrl,
        activationMode: "existing-account",
      };

      const sessionUser = await getSupabaseSessionUser();
      const sessionEmail = sessionUser?.email?.trim().toLowerCase() ?? "";
      if (sessionUser && sessionEmail) {
        if (sessionEmail !== lookup.invitation.email) {
          inviteState = {
            ok: false,
            inviteError: `This invitation is for ${lookup.invitation.email}. Sign out, then open the invite link again.`,
          };
        } else {
          const activation = await completeWorkspaceInviteLoginCore({
            token: inviteToken,
            tenantSlug: expectedSlug ?? hostSlug,
          });
          if (activation.ok) {
            redirect(activation.redirectPath);
          }
          inviteState = { ok: false, inviteError: activation.error };
        }
      }
    }
  }

  return (
    <LoginClient
      initialBrand={initialBrand}
      inviteState={inviteState}
      inviteTenantSlug={inviteTenantSlug}
      showApexPublicNav={!hostSlug}
    />
  );
}
