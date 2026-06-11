import type { UserRole } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/**
 * Local development only — Product Owner / Constitutional Authority role bundle.
 * Does not alter TAS ALE baselines or tenant RLS; only provisions RBAC rows and
 * short-circuits role lookups for the configured dev session identity.
 */
export const DEV_CONSTITUTIONAL_ROLE_BUNDLE: readonly UserRole[] = [
  "INTERNAL_AUDITOR",
  "GLOBAL_ADMIN",
  "CISO",
  "GRC_MANAGER",
] as const;

/** True when local constitutional elevation is allowed (never in production). */
export function isDevConstitutionalElevationEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return process.env.IRONFRAME_DEV_CONSTITUTIONAL_ELEVATION?.trim() !== "0";
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Whether the signed-in Supabase user is the local constitutional authority.
 * Match order: explicit user id → explicit email → dev elevation flag → any authenticated dev session.
 */
export function isDevConstitutionalAuthorityUser(user: User | null | undefined): boolean {
  if (!isDevConstitutionalElevationEnabled()) return false;
  const uid = user?.id?.trim() ?? "";
  if (!uid) return false;

  const configuredId = process.env.IRONFRAME_DEV_SUPABASE_USER_ID?.trim();
  if (configuredId && uid === configuredId) return true;

  const configuredEmail = normalizeEmail(process.env.IRONFRAME_DEV_SUPABASE_EMAIL);
  const sessionEmail = normalizeEmail(user?.email);
  if (configuredEmail && sessionEmail === configuredEmail) return true;

  if (process.env.IRONFRAME_DEV_CONSTITUTIONAL_ELEVATION?.trim() === "1") return true;

  // Default local dev: elevate authenticated sessions unless restricted by env above.
  if (!configuredId && !configuredEmail) return true;

  return false;
}

let provisionAllTenantsInflight: Promise<void> | null = null;
let lastProvisionedUserId: string | null = null;

/** Idempotently persist the full constitutional role bundle for one tenant. */
export async function provisionDevConstitutionalRolesForTenant(
  userId: string,
  tenantId: string,
): Promise<void> {
  const uid = userId.trim();
  const tid = tenantId.trim();
  if (!uid || !tid) return;

  for (const role of DEV_CONSTITUTIONAL_ROLE_BUNDLE) {
    const existing = await prisma.userRoleAssignment.findFirst({
      where: { userId: uid, tenantId: tid, role },
      select: { id: true },
    });
    if (existing?.id) continue;
    await prisma.userRoleAssignment.create({
      data: { userId: uid, tenantId: tid, role },
    });
  }
}

/** Provision constitutional roles on every canonical tenant (once per dev session user). */
export async function provisionDevConstitutionalRolesAllTenants(userId: string): Promise<void> {
  const uid = userId.trim();
  if (!uid) return;
  if (lastProvisionedUserId === uid) return;

  if (!provisionAllTenantsInflight) {
    provisionAllTenantsInflight = (async () => {
      const tenantIds = [...new Set(Object.values(TENANT_UUIDS))];
      for (const tenantId of tenantIds) {
        await provisionDevConstitutionalRolesForTenant(uid, tenantId);
      }
      lastProvisionedUserId = uid;
    })().finally(() => {
      provisionAllTenantsInflight = null;
    });
  }

  await provisionAllTenantsInflight;
}

/**
 * Meta-Audit / HITL gate: returns session user id when dev constitutional authority applies.
 */
export async function resolveDevConstitutionalAuthorityUserId(
  user: User | null | undefined,
  tenantId?: string | null,
): Promise<string | null> {
  if (!isDevConstitutionalAuthorityUser(user)) return null;
  const uid = user?.id?.trim() ?? "";
  if (!uid) return null;

  if (tenantId?.trim()) {
    await provisionDevConstitutionalRolesForTenant(uid, tenantId.trim());
  } else {
    await provisionDevConstitutionalRolesAllTenants(uid);
  }

  return uid;
}

/** Whether the user holds any of `roles` for `tenantId`, with dev constitutional bypass. */
export async function userHasTenantRoleOrDevElevation(
  user: User | null | undefined,
  tenantId: string,
  roles: readonly UserRole[],
): Promise<boolean> {
  const elevated = await resolveDevConstitutionalAuthorityUserId(user, tenantId);
  if (elevated) return true;

  const uid = user?.id?.trim() ?? "";
  if (!uid) return false;

  const row = await prisma.userRoleAssignment.findFirst({
    where: { userId: uid, tenantId, role: { in: [...roles] } },
    select: { id: true },
  });
  return row != null;
}

/** Tenant-agnostic approver check (Review Queue eligibility banner). */
export async function userHasAnyApproverRoleOrDevElevation(
  user: User | null | undefined,
  roles: readonly UserRole[],
): Promise<boolean> {
  if (isDevConstitutionalAuthorityUser(user)) {
    const uid = user?.id?.trim() ?? "";
    if (uid) await provisionDevConstitutionalRolesAllTenants(uid);
    return Boolean(uid);
  }

  const uid = user?.id?.trim() ?? "";
  if (!uid) return false;

  const row = await prisma.userRoleAssignment.findFirst({
    where: { userId: uid, role: { in: [...roles] } },
    select: { id: true },
  });
  return row != null;
}
