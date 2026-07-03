import "server-only";

import { UserRole } from "@prisma/client";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import {
  buildAuthCallbackUrl,
  resolveTenantAuthRedirectOrigin,
} from "@/app/lib/auth/publicAppUrl";
import { normalizeCorporateTenantSlug } from "@/app/lib/auth/tenantInviteMetadata";
import {
  invalidateTenantSlugCache,
  lookupTenantBySlug,
  normalizeProvisionedTenantSlug,
} from "@/app/lib/tenantSlugRegistry";
import {
  buildTenantLoginRedirectUrl,
  buildTenantSubdomainOrigin,
  resolvePostAuthLandingPath,
} from "@/app/lib/tenantSubdomain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseInviteDeliveryDeferrable } from "@/app/lib/server/corporateTenantInviteDelivery";
import { createWorkspaceInvitation } from "@/app/lib/auth/workspaceInvitationCore";
import {
  findSupabaseAuthUserByEmail,
  isSupabaseExistingUserError,
} from "@/app/lib/server/supabaseAuthAdminHelpers";
import {
  buildWorkspaceInviteLoginUrl,
  sendWorkspaceInviteEmailCore,
  summarizeWorkspaceInviteEmailDelivery,
} from "@/app/lib/server/workspaceInviteEmailDelivery";

export const PUBLIC_INTAKE_OPERATOR_ID = "PUBLIC_INTAKE";

export type ProvisionCorporateTenantCoreInput = {
  name: string;
  slugRaw: string;
  industry?: string | null;
  aleBaselineCentsRaw: string;
  operatorId: string;
  auditAction?: string;
  /** Required for non-admin provisioning lanes (sales intake, Stripe checkout). */
  invitationToken?: string | null;
  /** Platform-admin server actions bypass invite-only gate after RBAC check. */
  skipInvitationGate?: boolean;
};

export type ProvisionCorporateTenantCoreResult =
  | {
      ok: true;
      success: true;
      id: string;
      slug: string;
      name: string;
      workspaceUrl: string;
      redirectUrl: string;
    }
  | { ok: false; error: string };

export async function provisionCorporateTenantCore(
  input: ProvisionCorporateTenantCoreInput,
): Promise<ProvisionCorporateTenantCoreResult> {
  const name = input.name.trim();
  const slug = normalizeProvisionedTenantSlug(input.slugRaw.trim());
  const industry = input.industry?.trim() || null;
  const aleBaselineRaw = input.aleBaselineCentsRaw.trim() || "0";

  if (!name || name.length < 2) {
    return { ok: false, error: "Enter a corporate display name (at least 2 characters)." };
  }

  if (!slug) {
    return {
      ok: false,
      error:
        "Slug must be 2–63 lowercase letters, numbers, or hyphens — not a reserved host label (www, api, login, etc.).",
    };
  }

  if (!input.skipInvitationGate) {
    const token = input.invitationToken?.trim() ?? "";
    if (!token) {
      return {
        ok: false,
        error: "Active admin invitation token required for workspace provisioning.",
      };
    }
    const { validateWorkspaceInvitation } = await import("@/app/lib/auth/workspaceInvitationCore");
    const inviteCheck = await validateWorkspaceInvitation({
      token,
      tenantSlug: slug,
      consume: true,
    });
    if (!inviteCheck.ok) {
      return { ok: false, error: inviteCheck.error };
    }
  }

  let aleBaseline = 0n;
  try {
    aleBaseline = BigInt(aleBaselineRaw);
    if (aleBaseline < 0n) aleBaseline = 0n;
  } catch {
    return { ok: false, error: "aleBaselineCents must be a whole number of cents." };
  }

  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return { ok: false, error: `Tenant slug "${slug}" is already provisioned.` };
  }

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug,
        industry,
        ale_baseline: aleBaseline,
      },
      select: { id: true, slug: true, name: true },
    });

    invalidateTenantSlugCache(slug);

    const { ensureTenantBillingPending } = await import("@/app/lib/billing/tenantBillingEntitlement");
    await ensureTenantBillingPending(tenant.slug);

    await auditLogCreateLoose({
      data: {
        action: input.auditAction ?? "CORPORATE_TENANT_PROVISIONED",
        operatorId: input.operatorId,
        tenantId: tenant.id,
        justification: `Corporate tenant provisioned: ${tenant.name} (${tenant.slug}).`,
      },
    });

    const port = Number(process.env.PORT?.trim() || "3000") || 3000;
    const workspaceUrl = buildTenantSubdomainOrigin(tenant.slug, port);
    const redirectUrl = buildTenantLoginRedirectUrl(tenant.slug);
    return {
      ok: true,
      success: true,
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      workspaceUrl,
      redirectUrl,
    };
  } catch (e) {
    console.error("[provisionCorporateTenantCore]", e);
    return { ok: false, error: "Tenant provisioning failed." };
  }
}

export type InviteCorporateTenantUserCoreInput = {
  email: string;
  tenantSlugRaw: string;
  operatorId: string;
  role?: UserRole;
  auditAction?: string;
};

export type InviteCorporateTenantUserCoreResult =
  | {
      ok: true;
      email: string;
      tenantSlug: string;
      workspaceUrl: string;
      deliveryPath: "supabase-invite" | "workspace-invitation";
      inviteLoginUrl?: string;
      inviteEmail?: {
        sent: boolean;
        deliveryChannel?: string;
        error?: string;
      };
      supabaseInvite?: {
        user: Record<string, unknown> | null;
        rawData: Record<string, unknown> | null;
        redirectTo: string;
      };
    }
  | { ok: false; error: string; deferrable?: boolean };

function serializeSupabaseInvitePayload(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { note: "Supabase invite payload was not JSON-serializable." };
  }
}

async function issueWorkspaceInvitationForOperator(input: {
  email: string;
  tenant: { id: string; slug: string; name: string };
  operatorId: string;
  role: UserRole;
  userId: string;
  auditAction?: string;
}): Promise<InviteCorporateTenantUserCoreResult> {
  const existingRole = await prisma.userRoleAssignment.findFirst({
    where: {
      userId: input.userId,
      tenantId: input.tenant.id,
    },
    select: { id: true },
  });
  if (!existingRole) {
    await prisma.userRoleAssignment.create({
      data: {
        userId: input.userId,
        tenantId: input.tenant.id,
        role: input.role,
      },
    });
  }

  const invitation = await createWorkspaceInvitation({
    operatorId: input.operatorId,
    email: input.email,
    tenantSlug: input.tenant.slug,
  });
  if (!invitation.ok) {
    return { ok: false, error: invitation.error };
  }

  const tenantOrigin = resolveTenantAuthRedirectOrigin(input.tenant.slug);
  const inviteLoginUrl = buildWorkspaceInviteLoginUrl(invitation.token, input.tenant.slug);
  const inviteEmailResult = await sendWorkspaceInviteEmailCore({
    email: input.email,
    tenantSlug: input.tenant.slug,
    registerToken: invitation.token,
    tenantDisplayName: input.tenant.name,
    inviteExpiresAt: invitation.expiresAt,
  });

  await auditLogCreateLoose({
    data: {
      action: input.auditAction ?? "CORPORATE_USER_INVITED",
      operatorId: input.operatorId,
      tenantId: input.tenant.id,
      justification: `Workspace invitation issued for existing operator ${input.email} → tenant ${input.tenant.slug} (supabaseUserId=${input.userId}).`,
    },
  });

  return {
    ok: true,
    email: input.email,
    tenantSlug: input.tenant.slug,
    workspaceUrl: tenantOrigin,
    deliveryPath: "workspace-invitation",
    inviteLoginUrl,
    inviteEmail: summarizeWorkspaceInviteEmailDelivery(inviteEmailResult),
  };
}

export async function inviteCorporateTenantUserCore(
  input: InviteCorporateTenantUserCoreInput,
): Promise<InviteCorporateTenantUserCoreResult> {
  const email = input.email.trim().toLowerCase();
  const tenantSlug = normalizeCorporateTenantSlug(input.tenantSlugRaw.trim());
  const inviteRole = input.role ?? UserRole.GRC_MANAGER;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid corporate email address." };
  }

  if (!tenantSlug) {
    return {
      ok: false,
      error: "tenantSlug must be a valid DNS-safe workspace slug provisioned in the database.",
    };
  }

  const tenant = await lookupTenantBySlug(tenantSlug);
  if (!tenant) {
    return {
      ok: false,
      error: `Tenant "${tenantSlug}" is not provisioned. Create the tenant workspace before inviting users.`,
    };
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const tenantOrigin = resolveTenantAuthRedirectOrigin(tenant.slug);
    const landing = resolvePostAuthLandingPath(new URL(tenantOrigin).host);
    const redirectTo = buildAuthCallbackUrl(tenantOrigin, landing);

    const existingUser = await findSupabaseAuthUserByEmail(supabaseAdmin, email);
    if (existingUser?.id) {
      return issueWorkspaceInvitationForOperator({
        email,
        tenant,
        operatorId: input.operatorId,
        role: inviteRole,
        userId: existingUser.id,
        auditAction: input.auditAction,
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { tenant_slug: tenant.slug },
      redirectTo,
    });

    if (error) {
      if (isSupabaseExistingUserError(error.message)) {
        const recoveredUser = await findSupabaseAuthUserByEmail(supabaseAdmin, email);
        if (recoveredUser?.id) {
          return issueWorkspaceInvitationForOperator({
            email,
            tenant,
            operatorId: input.operatorId,
            role: inviteRole,
            userId: recoveredUser.id,
            auditAction: input.auditAction,
          });
        }
      }

      console.error("[inviteCorporateTenantUserCore]", error.message);
      const deferrable = isSupabaseInviteDeliveryDeferrable(error.message);
      if (deferrable) {
        console.warn(
          `[inviteCorporateTenantUserCore] invite delivery deferred for ${email} → ${tenant.slug}: ${error.message}`,
        );
      }
      return {
        ok: false,
        error: error.message || "Invitation failed.",
        deferrable,
      };
    }

    const invitedUserId = data.user?.id?.trim();
    if (invitedUserId) {
      const existingRole = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: invitedUserId,
          tenantId: tenant.id,
        },
        select: { id: true },
      });
      if (!existingRole) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: invitedUserId,
            tenantId: tenant.id,
            role: inviteRole,
          },
        });
      }
    }

    await auditLogCreateLoose({
      data: {
        action: input.auditAction ?? "CORPORATE_USER_INVITED",
        operatorId: input.operatorId,
        tenantId: tenant.id,
        justification: `B2B invite issued for ${email} → tenant ${tenant.slug} (supabaseUserId=${invitedUserId ?? "pending"}).`,
      },
    });

    return {
      ok: true,
      email,
      tenantSlug: tenant.slug,
      workspaceUrl: tenantOrigin,
      deliveryPath: "supabase-invite",
      supabaseInvite: {
        user: serializeSupabaseInvitePayload(data.user),
        rawData: serializeSupabaseInvitePayload(data),
        redirectTo,
      },
    };
  } catch (e) {
    console.error("[inviteCorporateTenantUserCore]", e);
    const message = e instanceof Error ? e.message : "Invitation failed. Verify SUPABASE_SERVICE_ROLE_KEY.";
    const deferrable = isSupabaseInviteDeliveryDeferrable(e);
    if (deferrable) {
      console.warn(`[inviteCorporateTenantUserCore] invite delivery deferred: ${message}`);
    }
    return { ok: false, error: message, deferrable };
  }
}
