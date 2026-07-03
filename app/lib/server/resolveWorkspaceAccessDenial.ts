import "server-only";

import { UserRole } from "@prisma/client";

import prisma from "@/lib/prisma";
import { buildTenantLoginRedirectUrl } from "@/app/lib/tenantSubdomain";
import type {
  AssignedWorkspaceAccess,
  WorkspaceAccessDenialContext,
} from "@/app/types/workspaceAccessDenial";
import { WORKSPACE_INVITATION_STATUS } from "@/app/utils/invitation-core";

export type { WorkspaceAccessDenialContext, WorkspaceAccessDenialReason } from "@/app/types/workspaceAccessDenial";

async function wasOperatorRevokedFromTenant(
  tenantId: string,
  tenantSlug: string,
  userId: string,
  email: string | null,
): Promise<boolean> {
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId,
      action: "OPERATOR_WORKSPACE_ACCESS_REVOKED",
    },
    select: { justification: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const needleUserId = userId.toLowerCase();
  const needleEmail = email?.trim().toLowerCase() ?? "";
  const needleSlug = tenantSlug.trim().toLowerCase();

  return rows.some((row) => {
    const justification = row.justification?.toLowerCase() ?? "";
    const matchesOperator =
      justification.includes(needleUserId) ||
      (needleEmail.length > 0 && justification.includes(needleEmail));
    const matchesTenant =
      justification.includes(`from ${needleSlug}`) ||
      justification.includes(`"${needleSlug}"`) ||
      justification.includes(`(${needleSlug})`);
    return matchesOperator && matchesTenant;
  });
}

/**
 * Restore RBAC rows for consumed invitations that were never administratively revoked.
 * Fixes assignment drift when an operator still has a valid activation on other workspaces.
 */
async function reconcileActivatedWorkspaceAccess(input: {
  userId: string;
  email: string | null;
  excludedTenantId: string | null;
}): Promise<void> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return;

  const consumedInvites = await prisma.tenantWorkspaceInvitation.findMany({
    where: {
      email,
      status: WORKSPACE_INVITATION_STATUS.CONSUMED,
    },
    select: { tenantSlug: true },
    distinct: ["tenantSlug"],
  });

  for (const invite of consumedInvites) {
    const slug = invite.tenantSlug?.trim().toLowerCase();
    if (!slug) continue;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) continue;
    if (input.excludedTenantId && tenant.id === input.excludedTenantId) continue;

    const existingAssignment = await prisma.userRoleAssignment.findFirst({
      where: { userId: input.userId, tenantId: tenant.id },
      select: { id: true },
    });
    if (existingAssignment) continue;

    const revokedInvite = await prisma.tenantWorkspaceInvitation.findFirst({
      where: {
        email,
        tenantSlug: slug,
        status: WORKSPACE_INVITATION_STATUS.REVOKED,
      },
      select: { id: true },
    });
    if (revokedInvite) continue;

    if (await wasOperatorRevokedFromTenant(tenant.id, slug, input.userId, email)) continue;

    await prisma.userRoleAssignment.create({
      data: {
        userId: input.userId,
        tenantId: tenant.id,
        role: UserRole.GRC_MANAGER,
      },
    });
  }
}

async function loadAssignedWorkspaces(
  userId: string,
  excludedTenantId: string | null,
): Promise<AssignedWorkspaceAccess[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: excludedTenantId
      ? { userId, tenantId: { not: excludedTenantId } }
      : { userId },
    select: { tenantId: true },
    distinct: ["tenantId"],
  });

  if (assignments.length === 0) return [];

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: assignments.map((row) => row.tenantId) } },
    select: { slug: true, name: true },
    orderBy: { name: "asc" },
  });

  return tenants.map((row) => ({
    slug: row.slug,
    name: row.name,
    loginUrl: buildTenantLoginRedirectUrl(row.slug),
  }));
}

async function resolveDeniedTenantReason(input: {
  userId: string;
  email: string;
  tenant: { id: string; slug: string; name: string };
  invitations: Array<{ status: string }>;
}): Promise<WorkspaceAccessDenialContext["reason"]> {
  const hasRevokedInvite = input.invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.REVOKED,
  );
  const hasConsumedInvite = input.invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.CONSUMED,
  );
  const hasActiveInvite = input.invitations.some(
    (row) => row.status === WORKSPACE_INVITATION_STATUS.ACTIVE,
  );

  const deniedAssignment = await prisma.userRoleAssignment.findFirst({
    where: { userId: input.userId, tenantId: input.tenant.id },
    select: { id: true },
  });

  if (deniedAssignment) {
    return "no_workspace_access";
  }

  if (
    hasRevokedInvite ||
    (hasConsumedInvite &&
      (await wasOperatorRevokedFromTenant(
        input.tenant.id,
        input.tenant.slug,
        input.userId,
        input.email,
      )))
  ) {
    return "revoked";
  }

  if (hasConsumedInvite) {
    return "revoked";
  }

  if (hasActiveInvite) {
    return "activation_pending";
  }

  return "never_provisioned";
}

/**
 * Distinguish revoked operators from never-provisioned accounts for /unauthorized UX.
 */
export async function resolveWorkspaceAccessDenial(input: {
  userId: string;
  email: string | null;
  tenantUuid: string | null;
}): Promise<WorkspaceAccessDenialContext> {
  const userId = input.userId.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const tenantUuid = input.tenantUuid?.trim() || null;

  let tenant: { id: string; slug: string; name: string } | null = null;
  if (tenantUuid) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantUuid },
      select: { id: true, slug: true, name: true },
    });
  }

  await reconcileActivatedWorkspaceAccess({
    userId,
    email,
    excludedTenantId: tenant?.id ?? null,
  });

  const assignedWorkspaces = await loadAssignedWorkspaces(userId, tenant?.id ?? null);

  if (tenant && email) {
    const invitations = await prisma.tenantWorkspaceInvitation.findMany({
      where: { email, tenantSlug: tenant.slug },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { status: true },
    });

    const reason = await resolveDeniedTenantReason({
      userId,
      email,
      tenant,
      invitations,
    });

    if (reason !== "never_provisioned" && reason !== "no_workspace_access") {
      return {
        reason,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        tenantUuid: tenant.id,
        assignedWorkspaces,
      };
    }
  }

  if (assignedWorkspaces.length > 0) {
    return {
      reason: "no_workspace_access",
      tenantSlug: tenant?.slug ?? null,
      tenantName: tenant?.name ?? null,
      tenantUuid: tenant?.id ?? tenantUuid,
      assignedWorkspaces,
    };
  }

  return {
    reason: "never_provisioned",
    tenantSlug: tenant?.slug ?? null,
    tenantName: tenant?.name ?? null,
    tenantUuid: tenant?.id ?? tenantUuid,
    assignedWorkspaces,
  };
}
