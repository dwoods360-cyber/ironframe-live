import { UserRole } from "@prisma/client";

import prisma from "@/lib/prisma";

export const WORKSPACE_PROFILE_EDITOR_ROLES: UserRole[] = [
  UserRole.GRC_MANAGER,
  UserRole.CISO,
];

export async function canEditWorkspaceProfile(
  userId: string,
  tenantUuid: string,
): Promise<boolean> {
  const assignment = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      tenantId: tenantUuid,
      role: { in: WORKSPACE_PROFILE_EDITOR_ROLES },
    },
    select: { id: true },
  });
  return Boolean(assignment);
}
