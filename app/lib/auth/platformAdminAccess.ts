import "server-only";

import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isPlatformGlobalAdminEmail } from "@/config/platformSecurity";
import { isDevConstitutionalAuthorityUser } from "@/app/lib/grc/devConstitutionalElevation";
import { getSupabaseSessionUser, userEligibleForRemoteAccessToggle } from "@/app/utils/serverAuth";
import type { User } from "@supabase/supabase-js";

function minimalUserForElevation(userId: string, email: string | null | undefined): User {
  return { id: userId, email: email ?? undefined } as User;
}

async function resolveGlobalAdminAssignment(userId: string): Promise<boolean> {
  const globalAdmin = await prisma.userRoleAssignment.findFirst({
    where: { userId, role: UserRole.GLOBAL_ADMIN },
    select: { id: true },
  });
  return Boolean(globalAdmin?.id);
}

/** Edge/middleware gate — user id + email from Supabase JWT (no cookie session required). */
export async function isPlatformAdministratorIdentity(
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const uid = userId.trim();
  if (!uid) return false;

  const stubUser = minimalUserForElevation(uid, email);
  if (isPlatformGlobalAdminEmail(email)) {
    return true;
  }
  if (userEligibleForRemoteAccessToggle(stubUser) || isDevConstitutionalAuthorityUser(stubUser)) {
    return true;
  }

  return resolveGlobalAdminAssignment(uid);
}

export async function canUsePlatformAdminTools(): Promise<boolean> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) return false;
  return isPlatformAdministratorIdentity(user.id, user.email);
}

export async function requirePlatformAdministrator(): Promise<
  { userId: string } | { error: string }
> {
  const user = await getSupabaseSessionUser();
  if (!user?.id?.trim()) {
    return { error: "Platform administrator session required." };
  }

  const allowed = await isPlatformAdministratorIdentity(user.id, user.email);
  if (!allowed) {
    return { error: "GLOBAL_ADMIN role required." };
  }

  return { userId: user.id.trim() };
}
