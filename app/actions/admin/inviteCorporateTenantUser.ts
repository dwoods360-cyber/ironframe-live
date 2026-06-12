"use server";

import { UserRole } from "@prisma/client";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { resolvePublicAppUrl } from "@/app/lib/auth/publicAppUrl";
import { normalizeCorporateTenantSlug } from "@/app/lib/auth/tenantInviteMetadata";
import { isDevConstitutionalAuthorityUser } from "@/app/lib/grc/devConstitutionalElevation";
import { getSupabaseSessionUser, userEligibleForRemoteAccessToggle } from "@/app/utils/serverAuth";
import { TENANT_UUIDS, type TenantKey } from "@/app/utils/tenantIsolation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type InviteCorporateTenantUserResult =
  | { ok: true; email: string; tenantSlug: TenantKey }
  | { ok: false; error: string };

async function ensurePlatformAdministrator(): Promise<
  { userId: string } | { error: string }
> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return { error: "Platform administrator session required." };
  }

  if (userEligibleForRemoteAccessToggle(user) || isDevConstitutionalAuthorityUser(user)) {
    return { userId: user.id.trim() };
  }

  const globalAdmin = await prisma.userRoleAssignment.findFirst({
    where: { userId: user.id.trim(), role: UserRole.GLOBAL_ADMIN },
    select: { id: true },
  });

  if (!globalAdmin?.id) {
    return { error: "GLOBAL_ADMIN role required to invite corporate users." };
  }

  return { userId: user.id.trim() };
}

export async function inviteCorporateTenantUserAction(
  formData: FormData,
): Promise<InviteCorporateTenantUserResult> {
  const admin = await ensurePlatformAdministrator();
  if ("error" in admin) {
    return { ok: false, error: admin.error };
  }
  const adminUserId = admin.userId;

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const tenantSlugRaw = String(formData.get("tenantSlug") ?? "").trim();
  const tenantSlug = normalizeCorporateTenantSlug(tenantSlugRaw);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid corporate email address." };
  }

  if (!tenantSlug) {
    return { ok: false, error: "tenantSlug must be medshield, vaultbank, gridcore, or defense." };
  }

  const tenantUuid = TENANT_UUIDS[tenantSlug];
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantUuid },
    select: { id: true, slug: true },
  });
  if (!tenant) {
    return { ok: false, error: `Tenant ${tenantSlug} is not provisioned in the database.` };
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const appUrl = resolvePublicAppUrl();
    const redirectTo = `${appUrl}/api/auth/callback?next=/integrity`;

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { tenant_slug: tenantSlug },
      redirectTo,
    });

    if (error) {
      console.error("[inviteCorporateTenantUserAction]", error.message);
      return { ok: false, error: error.message || "Invitation failed." };
    }

    const invitedUserId = data.user?.id?.trim();
    if (invitedUserId) {
      const existingRole = await prisma.userRoleAssignment.findFirst({
        where: {
          userId: invitedUserId,
          tenantId: tenantUuid,
          role: UserRole.GRC_MANAGER,
        },
        select: { id: true },
      });
      if (!existingRole) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: invitedUserId,
            tenantId: tenantUuid,
            role: UserRole.GRC_MANAGER,
          },
        });
      }
    }

    await auditLogCreateLoose({
      data: {
        action: "CORPORATE_USER_INVITED",
        operatorId: adminUserId,
        tenantId: tenantUuid,
        justification: `B2B invite issued for ${email} → tenant ${tenantSlug} (supabaseUserId=${invitedUserId ?? "pending"}).`,
      },
    });

    return { ok: true, email, tenantSlug };
  } catch (e) {
    console.error("[inviteCorporateTenantUserAction]", e);
    return { ok: false, error: "Invitation failed. Verify SUPABASE_SERVICE_ROLE_KEY." };
  }
}
