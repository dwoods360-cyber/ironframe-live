import "server-only";

import { buildTenantActivationLandingUrl } from "@/app/lib/auth/workspaceActivationLanding";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { buildTenantLoginRedirectUrl } from "@/app/lib/tenantSubdomain";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  hashWorkspaceInvitationToken,
  WORKSPACE_INVITATION_STATUS,
} from "@/app/utils/invitation-core";
import prisma from "@/lib/prisma";

import { operatorSupabaseAccountExists } from "@/app/lib/server/workspaceInviteIngressRouting";

export type ConsumedInviteRecoveryRedirect = {
  redirectTo: string;
  reason: "active-session" | "sign-in-required";
};

/**
 * After an invite is consumed, reopening the email link should not block operators
 * who already activated — send them to get-started or tenant sign-in instead.
 */
export async function resolveConsumedWorkspaceInviteRedirect(
  token: string,
): Promise<ConsumedInviteRecoveryRedirect | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const row = await prisma.tenantWorkspaceInvitation.findUnique({
    where: { tokenHash: hashWorkspaceInvitationToken(trimmed) },
    select: {
      status: true,
      email: true,
      tenantSlug: true,
    },
  });

  if (!row || row.status !== WORKSPACE_INVITATION_STATUS.CONSUMED) {
    return null;
  }

  const email = row.email?.trim().toLowerCase() ?? "";
  const tenantSlug = row.tenantSlug?.trim().toLowerCase() ?? "";
  if (!email || !tenantSlug) return null;

  const tenant = await lookupTenantBySlug(tenantSlug);
  if (!tenant) return null;

  const sessionUser = await getSupabaseSessionUser();
  const sessionEmail = sessionUser?.email?.trim().toLowerCase() ?? "";
  const sessionUserId = sessionUser?.id?.trim();

  if (sessionUserId && sessionEmail === email) {
    const role = await prisma.userRoleAssignment.findFirst({
      where: { userId: sessionUserId, tenantId: tenant.id },
      select: { id: true },
    });
    if (role) {
      return {
        redirectTo: buildTenantActivationLandingUrl(tenantSlug),
        reason: "active-session",
      };
    }
  }

  if (await operatorSupabaseAccountExists(email)) {
    return {
      redirectTo: buildTenantLoginRedirectUrl(tenantSlug),
      reason: "sign-in-required",
    };
  }

  return null;
}

export async function lookupConsumedInviteTenantSlug(token: string): Promise<string | null> {
  const row = await prisma.tenantWorkspaceInvitation.findUnique({
    where: { tokenHash: hashWorkspaceInvitationToken(token.trim()) },
    select: { tenantSlug: true, status: true },
  });
  if (!row || row.status !== WORKSPACE_INVITATION_STATUS.CONSUMED) return null;
  return row.tenantSlug?.trim().toLowerCase() || null;
}

/** True when the operator already finished activation for this consumed invite. */
export async function operatorAlreadyActivatedConsumedInvite(input: {
  email: string;
  tenantSlug: string;
}): Promise<boolean> {
  const email = input.email.trim().toLowerCase();
  const tenantSlug = input.tenantSlug.trim().toLowerCase();
  if (!email || !tenantSlug) return false;

  const tenant = await lookupTenantBySlug(tenantSlug);
  if (!tenant) return false;

  if (!(await operatorSupabaseAccountExists(email))) return false;

  const { findSupabaseAuthUserByEmail } = await import(
    "@/app/lib/server/supabaseAuthAdminHelpers"
  );
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const supabaseAdmin = createSupabaseAdminClient();
  const user = await findSupabaseAuthUserByEmail(supabaseAdmin, email);
  const userId = user?.id?.trim();
  if (!userId) return false;

  const role = await prisma.userRoleAssignment.findFirst({
    where: { userId, tenantId: tenant.id },
    select: { id: true },
  });
  return Boolean(role);
}
