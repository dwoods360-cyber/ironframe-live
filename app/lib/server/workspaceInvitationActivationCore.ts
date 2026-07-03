import "server-only";

import { UserRole } from "@prisma/client";

import { validateWorkspaceInvitation } from "@/app/lib/auth/workspaceInvitationCore";
import { hashWorkspaceInvitationToken } from "@/app/utils/invitation-core";
import { recordLegalConsent } from "@/app/lib/legal/consent";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import {
  buildTenantActivationLandingUrl,
  workspaceActivationNextParam,
} from "@/app/lib/auth/workspaceActivationLanding";
import { stampWorkspaceTenantCookie } from "@/app/lib/auth/stampWorkspaceTenantCookie";
import {
  findSupabaseAuthUserByEmail,
  isSupabaseExistingUserError,
  buildTenantWorkspaceSessionHandoffUrl,
} from "@/app/lib/server/supabaseAuthAdminHelpers";
import { operatorAlreadyActivatedConsumedInvite } from "@/app/lib/server/workspaceInvitationRecovery";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import prisma from "@/lib/prisma";
import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";

const MIN_PASSWORD_LENGTH = 8;
const ACTIVATION_OPERATOR_ID = "WORKSPACE_INVITE_ACTIVATION";

export type ActivateWorkspaceInvitationInput = {
  token: string;
  password: string;
  confirmPassword: string;
  msaAccepted: boolean;
  dpaAccepted: boolean;
};

export type ActivateWorkspaceInvitationResult =
  | {
      ok: true;
      email: string;
      tenantSlug: string | null;
      redirectUrl: string;
      /** Cross-host session bridge — client navigates here instead of signIn on registration host. */
      sessionHandoffUrl?: string | null;
    }
  | { ok: false; error: string };

export async function activateWorkspaceInvitationCore(
  input: ActivateWorkspaceInvitationInput,
): Promise<ActivateWorkspaceInvitationResult> {
  const token = input.token.trim();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (!token) {
    return { ok: false, error: "Invitation token is required." };
  }

  if (!input.msaAccepted || !input.dpaAccepted) {
    return { ok: false, error: "MSA and DPA certifications are required." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match." };
  }

  const tokenHash = hashWorkspaceInvitationToken(token);
  const invitation = await prisma.tenantWorkspaceInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      tenantSlug: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    return { ok: false, error: "Invitation token not recognized." };
  }

  const email = invitation.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return {
      ok: false,
      error: "This invitation is not bound to an operator email. Contact your administrator.",
    };
  }

  const tenantSlug = invitation.tenantSlug?.trim().toLowerCase() || null;
  let tenantId: string | null = null;

  if (tenantSlug) {
    const tenant = await lookupTenantBySlug(tenantSlug);
    if (!tenant) {
      return {
        ok: false,
        error: `Workspace "${tenantSlug}" is not provisioned yet. Contact your administrator.`,
      };
    }
    tenantId = tenant.id;
  }

  if (invitation.status === WORKSPACE_INVITATION_STATUS.CONSUMED) {
    const alreadyActive = await operatorAlreadyActivatedConsumedInvite({
      email,
      tenantSlug: tenantSlug ?? "",
    });
    if (!alreadyActive || !tenantSlug) {
      return {
        ok: false,
        error: "This invitation has already been used. Sign in at your workspace URL.",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const sessionHandoffUrl = await buildTenantWorkspaceSessionHandoffUrl(supabaseAdmin, {
      email,
      tenantSlug,
      nextPath: workspaceActivationNextParam(),
      password,
    });

    return {
      ok: true,
      email,
      tenantSlug,
      redirectUrl: buildTenantActivationLandingUrl(tenantSlug),
      sessionHandoffUrl,
    };
  }

  const inviteCheck = await validateWorkspaceInvitation({
    token,
    email,
    tenantSlug: invitation.tenantSlug,
    consume: false,
  });

  if (!inviteCheck.ok) {
    return { ok: false, error: inviteCheck.error };
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: tenantSlug ? { tenant_slug: tenantSlug } : undefined,
    });

    let userId = created.user?.id?.trim();

    if (createError) {
      if (!isSupabaseExistingUserError(createError.message)) {
        console.error("[activateWorkspaceInvitationCore] createUser", createError.message);
        return { ok: false, error: createError.message || "Account activation failed." };
      }

      const existingUser = await findSupabaseAuthUserByEmail(supabaseAdmin, email);
      if (!existingUser?.id) {
        return {
          ok: false,
          error: "An account already exists for this email but could not be loaded. Sign in or reset your password.",
        };
      }

      const mergedMetadata = {
        ...(existingUser.user_metadata ?? {}),
        ...(tenantSlug ? { tenant_slug: tenantSlug } : {}),
      };

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: mergedMetadata,
      });

      if (updateError) {
        console.error("[activateWorkspaceInvitationCore] updateUserById", updateError.message);
        return { ok: false, error: updateError.message || "Account activation failed." };
      }

      userId = existingUser.id;
    }

    if (!userId) {
      return { ok: false, error: "Account activation failed — missing user id." };
    }

    if (tenantId) {
      const existingRole = await prisma.userRoleAssignment.findFirst({
        where: { userId, tenantId },
        select: { id: true },
      });
      if (!existingRole) {
        await prisma.userRoleAssignment.create({
          data: {
            userId,
            tenantId,
            role: UserRole.GRC_MANAGER,
          },
        });
      }
    }

    await recordLegalConsent(userId);

    if (tenantSlug) {
      await stampWorkspaceTenantCookie(tenantSlug);
    }

    const consumed = await validateWorkspaceInvitation({
      token,
      email,
      tenantSlug,
      consume: true,
    });

    if (!consumed.ok) {
      console.error("[activateWorkspaceInvitationCore] consume failed after createUser", consumed.error);
    }

    const redirectUrl = tenantSlug
      ? buildTenantActivationLandingUrl(tenantSlug)
      : "/integrity";

    let sessionHandoffUrl: string | null = null;
    if (tenantSlug) {
      sessionHandoffUrl = await buildTenantWorkspaceSessionHandoffUrl(supabaseAdmin, {
        email,
        tenantSlug,
        nextPath: workspaceActivationNextParam(),
        password,
      });

      if (!sessionHandoffUrl) {
        for (let attempt = 0; attempt < 3 && !sessionHandoffUrl; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
          sessionHandoffUrl = await buildTenantWorkspaceSessionHandoffUrl(supabaseAdmin, {
            email,
            tenantSlug,
            nextPath: workspaceActivationNextParam(),
            password,
          });
        }
      }

      if (!sessionHandoffUrl) {
        return {
          ok: false,
          error:
            "Workspace session bridge failed after activation. Sign in at your workspace URL or contact support.",
        };
      }
    }

    console.info(
      `[activateWorkspaceInvitationCore] activated ${email} invitation=${invitation.id} operator=${ACTIVATION_OPERATOR_ID}`,
    );

    return {
      ok: true,
      email,
      tenantSlug,
      redirectUrl,
      sessionHandoffUrl,
    };
  } catch (e) {
    console.error("[activateWorkspaceInvitationCore]", e);
    return { ok: false, error: "Account activation failed. Try again or contact support." };
  }
}
