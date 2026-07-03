import "server-only";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { normalizeProvisionedTenantSlug } from "@/app/lib/tenantSlugRegistry";
import { findSupabaseAuthUserByEmail, revokeAllSupabaseSessionsForUser } from "@/app/lib/server/supabaseAuthAdminHelpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";

export type RevokeOperatorAccessInput = {
  operatorId: string;
  email: string;
  tenantSlugRaw: string;
};

export type RevokeOperatorAccessResult =
  | {
      ok: true;
      message: string;
      tenantSlug: string;
      email: string;
      assignmentsRemoved: number;
      invitationsRevoked: number;
      authUserDeleted: boolean;
      metadataCleared: boolean;
      sessionsRevoked: boolean;
      remainingAssignmentCount: number;
    }
  | {
      ok: false;
      error: string;
      code: "VALIDATION" | "NOT_FOUND" | "SUPABASE_ERROR" | "DATABASE_ERROR";
    };

export async function revokeOperatorAccessCore(
  input: RevokeOperatorAccessInput,
): Promise<RevokeOperatorAccessResult> {
  const email = input.email.trim().toLowerCase();
  const tenantSlug = normalizeProvisionedTenantSlug(input.tenantSlugRaw.trim());

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid operator email address.", code: "VALIDATION" };
  }

  if (!tenantSlug) {
    return { ok: false, error: "Enter a valid workspace slug.", code: "VALIDATION" };
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      return {
        ok: false,
        error: `Workspace slug "${tenantSlug}" was not found.`,
        code: "NOT_FOUND",
      };
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const authUser = await findSupabaseAuthUserByEmail(supabaseAdmin, email);

    if (!authUser?.id) {
      return {
        ok: false,
        error: `No Supabase auth user found for ${email}.`,
        code: "NOT_FOUND",
      };
    }

    const userId = authUser.id.trim();

    const deleteResult = await prisma.userRoleAssignment.deleteMany({
      where: {
        userId,
        tenantId: tenant.id,
      },
    });

    if (deleteResult.count === 0) {
      return {
        ok: false,
        error: `Operator ${email} has no role assignment on workspace "${tenantSlug}".`,
        code: "NOT_FOUND",
      };
    }

    const invitationUpdate = await prisma.tenantWorkspaceInvitation.updateMany({
      where: {
        email,
        tenantSlug: tenant.slug,
        status: WORKSPACE_INVITATION_STATUS.ACTIVE,
      },
      data: {
        status: WORKSPACE_INVITATION_STATUS.REVOKED,
      },
    });

    const remainingAssignmentCount = await prisma.userRoleAssignment.count({
      where: { userId },
    });

    let authUserDeleted = false;
    let metadataCleared = false;
    let sessionsRevoked = false;
    const metaSlug = String(authUser.user_metadata?.tenant_slug ?? "")
      .trim()
      .toLowerCase();

    const sessionRevoke = await revokeAllSupabaseSessionsForUser(supabaseAdmin, userId);
    if (!sessionRevoke.ok) {
      console.error("[revokeOperatorAccessCore] signOut global", sessionRevoke.error);
      return {
        ok: false,
        error: `Role assignments were removed but session revocation failed: ${sessionRevoke.error}`,
        code: "SUPABASE_ERROR",
      };
    }
    sessionsRevoked = true;

    if (remainingAssignmentCount === 0) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        console.error("[revokeOperatorAccessCore] deleteUser", error.message);
        return {
          ok: false,
          error: `Role assignments were removed but Supabase auth deletion failed: ${error.message}`,
          code: "SUPABASE_ERROR",
        };
      }
      authUserDeleted = true;
    } else if (metaSlug === tenant.slug) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...(authUser.user_metadata ?? {}),
          tenant_slug: null,
        },
      });
      if (error) {
        console.error("[revokeOperatorAccessCore] updateUserById", error.message);
        return {
          ok: false,
          error: `Role assignments were removed but metadata cleanup failed: ${error.message}`,
          code: "SUPABASE_ERROR",
        };
      }
      metadataCleared = true;
    }

    await auditLogCreateLoose({
      data: {
        action: "OPERATOR_WORKSPACE_ACCESS_REVOKED",
        operatorId: input.operatorId,
        tenantId: tenant.id,
        justification: `Revoked ${email} from ${tenant.slug}. assignmentsRemoved=${deleteResult.count} invitationsRevoked=${invitationUpdate.count} sessionsRevoked=${sessionsRevoked} authUserDeleted=${authUserDeleted} metadataCleared=${metadataCleared} remainingAssignments=${remainingAssignmentCount}.`,
      },
    });

    let message = `Removed ${email} from workspace "${tenant.name}" (${tenant.slug}).`;
    if (sessionsRevoked) {
      message += " All active Supabase sessions were terminated.";
    }
    if (invitationUpdate.count > 0) {
      message += ` Revoked ${invitationUpdate.count} active invitation(s).`;
    }
    if (authUserDeleted) {
      message += " No remaining workspace assignments — Supabase auth identity deleted.";
    } else if (metadataCleared) {
      message += ` Auth identity retained (${remainingAssignmentCount} other workspace assignment(s)); default tenant metadata cleared.`;
    } else {
      message += ` Auth identity retained (${remainingAssignmentCount} other workspace assignment(s)).`;
    }

    return {
      ok: true,
      message,
      tenantSlug: tenant.slug,
      email,
      assignmentsRemoved: deleteResult.count,
      invitationsRevoked: invitationUpdate.count,
      authUserDeleted,
      metadataCleared,
      sessionsRevoked,
      remainingAssignmentCount,
    };
  } catch (error) {
    console.error("[revokeOperatorAccessCore]", error);
    return {
      ok: false,
      error: "Operator access revocation failed. Retry in a moment.",
      code: "DATABASE_ERROR",
    };
  }
}
