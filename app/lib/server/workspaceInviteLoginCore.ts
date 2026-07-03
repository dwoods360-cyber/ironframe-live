import "server-only";

import { cookies } from "next/headers";

import { ensureCorporateInviteRoleAssignment } from "@/app/lib/auth/corporateInviteProvisioning";
import { validateWorkspaceInvitation } from "@/app/lib/auth/workspaceInvitationCore";
import { recordLegalConsent } from "@/app/lib/legal/consent";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import {
  buildTenantActivationLandingUrl,
} from "@/app/lib/auth/workspaceActivationLanding";
import { tenantUuidFromSlug } from "@/app/lib/tenantSubdomain";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  hashWorkspaceInvitationToken,
  WORKSPACE_INVITATION_STATUS,
} from "@/app/utils/invitation-core";
import prisma from "@/lib/prisma";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type CompleteWorkspaceInviteLoginInput = {
  token: string;
  tenantSlug?: string | null;
};

export type CompleteWorkspaceInviteLoginResult =
  | { ok: true; redirectPath: string; tenantSlug: string }
  | { ok: false; error: string };

/**
 * After password sign-in on the tenant host, consume the invite and bind RBAC + tenant cookie.
 */
export async function completeWorkspaceInviteLoginCore(
  input: CompleteWorkspaceInviteLoginInput,
): Promise<CompleteWorkspaceInviteLoginResult> {
  const token = input.token.trim();
  const tenantSlug = input.tenantSlug?.trim().toLowerCase() || "";
  if (!token) {
    return { ok: false, error: "Invitation token is required." };
  }

  const user = await getSupabaseSessionUser();
  const userId = user?.id?.trim();
  const email = user?.email?.trim().toLowerCase();
  if (!userId || !email) {
    return { ok: false, error: "Sign in before completing workspace activation." };
  }

  const tokenHash = hashWorkspaceInvitationToken(token);
  const invitationRow = await prisma.tenantWorkspaceInvitation.findUnique({
    where: { tokenHash },
    select: { status: true, email: true, tenantSlug: true },
  });

  if (invitationRow?.status === WORKSPACE_INVITATION_STATUS.CONSUMED) {
    const boundEmail = invitationRow.email?.trim().toLowerCase() ?? "";
    const boundSlug = invitationRow.tenantSlug?.trim().toLowerCase() || tenantSlug;
    if (boundEmail && boundEmail === email && boundSlug) {
      const tenant = await lookupTenantBySlug(boundSlug);
      if (tenant) {
        const role = await prisma.userRoleAssignment.findFirst({
          where: { userId, tenantId: tenant.id },
          select: { id: true },
        });
        if (role) {
          await recordLegalConsent(userId);
          const cookieUuid = tenant.id ?? tenantUuidFromSlug(boundSlug);
          if (cookieUuid) {
            const store = await cookies();
            store.set(IRONFRAME_TENANT_COOKIE, cookieUuid, {
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              maxAge: TENANT_COOKIE_MAX_AGE,
            });
            store.set(SIMULATION_MODE_COOKIE, "0", {
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              maxAge: TENANT_COOKIE_MAX_AGE,
            });
          }
          return {
            ok: true,
            redirectPath: buildTenantActivationLandingUrl(boundSlug),
            tenantSlug: boundSlug,
          };
        }
      }
    }
    return {
      ok: false,
      error: "This invitation has already been used. Sign in with your existing credentials.",
    };
  }

  const consumed = await validateWorkspaceInvitation({
    token,
    email,
    tenantSlug: tenantSlug || undefined,
    consume: true,
  });

  if (!consumed.ok) {
    return { ok: false, error: consumed.error };
  }

  if (!tenantSlug) {
    return { ok: false, error: "Workspace activation must complete on your tenant login host." };
  }

  const tenant = await lookupTenantBySlug(tenantSlug);
  if (!tenant) {
    return {
      ok: false,
      error: `Workspace "${tenantSlug}" is not provisioned yet. Contact your administrator.`,
    };
  }

  await ensureCorporateInviteRoleAssignment(userId, tenantSlug);
  await recordLegalConsent(userId);

  const cookieUuid = tenant.id ?? tenantUuidFromSlug(tenantSlug);
  if (cookieUuid) {
    const store = await cookies();
    store.set(IRONFRAME_TENANT_COOKIE, cookieUuid, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TENANT_COOKIE_MAX_AGE,
    });
    store.set(SIMULATION_MODE_COOKIE, "0", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TENANT_COOKIE_MAX_AGE,
    });
  }

  return {
    ok: true,
    redirectPath: buildTenantActivationLandingUrl(tenantSlug),
    tenantSlug,
  };
}
