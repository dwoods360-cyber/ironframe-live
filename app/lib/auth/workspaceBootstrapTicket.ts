import "server-only";

import { randomBytes } from "crypto";

import { isPlatformAdministratorIdentity } from "@/app/lib/auth/platformAdminAccess";
import { userHasTenantRoleAssignment } from "@/app/lib/security/tenantMembershipGuard";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";

/** Absolute ceiling for cross-host workspace session exchange (GRC hardening). */
export const WORKSPACE_BOOTSTRAP_TTL_MS = 30_000;

export type WorkspaceBootstrapTicket = {
  userId: string;
  userEmail: string | null;
  tenantSlug: string;
  tenantUuid: string;
  accessToken: string;
  refreshToken: string;
  nextPath: string;
  exp: number;
};

type TicketStore = Map<string, WorkspaceBootstrapTicket>;

const globalStore = globalThis as typeof globalThis & {
  __ironframeWorkspaceBootstrapTickets?: TicketStore;
};

function ticketStore(): TicketStore {
  if (!globalStore.__ironframeWorkspaceBootstrapTickets) {
    globalStore.__ironframeWorkspaceBootstrapTickets = new Map();
  }
  return globalStore.__ironframeWorkspaceBootstrapTickets;
}

function purgeExpiredTickets(nowMs = Date.now()): void {
  const store = ticketStore();
  for (const [jti, record] of store) {
    if (nowMs > record.exp) {
      store.delete(jti);
    }
  }
}

function normalizeBootstrapToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("bt_")) return null;
  const jti = trimmed.slice(3);
  if (!jti || jti.length < 16) return null;
  return jti;
}

export function userIdFromAccessToken(accessToken: string): string | null {
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
      sub?: unknown;
    };
    return typeof payload.sub === "string" && payload.sub.trim() ? payload.sub.trim() : null;
  } catch {
    return null;
  }
}

export async function authorizeWorkspaceBootstrapMint(
  userId: string,
  email: string | null | undefined,
  tenantSlug: string,
): Promise<{ tenantUuid: string; tenantSlug: string } | { error: string }> {
  const slug = tenantSlug.trim().toLowerCase();
  if (!slug) return { error: "missing_tenant" };

  const tenant = await lookupTenantBySlug(slug);
  if (!tenant?.id?.trim()) return { error: "unknown_tenant" };

  const uid = userId.trim();
  if (!uid) return { error: "missing_user" };

  if (await isPlatformAdministratorIdentity(uid, email)) {
    return { tenantUuid: tenant.id.trim(), tenantSlug: slug };
  }

  const hasAssignment = await userHasTenantRoleAssignment(uid, tenant.id.trim());
  if (!hasAssignment) {
    return { error: "tenant_membership_required" };
  }

  return { tenantUuid: tenant.id.trim(), tenantSlug: slug };
}

export async function assertWorkspaceBootstrapMembership(
  userId: string,
  tenantUuid: string,
  email: string | null | undefined,
): Promise<boolean> {
  const uid = userId.trim();
  const tid = tenantUuid.trim();
  if (!uid || !tid) return false;

  if (await isPlatformAdministratorIdentity(uid, email)) {
    return true;
  }

  return userHasTenantRoleAssignment(uid, tid);
}

export function mintWorkspaceBootstrapTicket(input: {
  userId: string;
  userEmail?: string | null;
  tenantSlug: string;
  tenantUuid: string;
  accessToken: string;
  refreshToken: string;
  nextPath: string;
  nowMs?: number;
}): string {
  const nowMs = input.nowMs ?? Date.now();
  purgeExpiredTickets(nowMs);

  const jti = randomBytes(32).toString("base64url");
  const tenantSlug = input.tenantSlug.trim().toLowerCase();

  ticketStore().set(jti, {
    userId: input.userId.trim(),
    userEmail: input.userEmail?.trim() || null,
    tenantSlug,
    tenantUuid: input.tenantUuid.trim(),
    accessToken: input.accessToken.trim(),
    refreshToken: input.refreshToken.trim(),
    nextPath: input.nextPath.trim() || "/",
    exp: nowMs + WORKSPACE_BOOTSTRAP_TTL_MS,
  });

  return `bt_${jti}`;
}

/**
 * Single-use redemption — ticket is shredded on first lookup regardless of outcome.
 * `expectedTenantSlug` must match the host-bound workspace slug.
 */
export function consumeWorkspaceBootstrapTicket(
  token: string,
  expectedTenantSlug: string,
): WorkspaceBootstrapTicket | null {
  const jti = normalizeBootstrapToken(token);
  if (!jti) return null;

  purgeExpiredTickets();

  const store = ticketStore();
  const record = store.get(jti);
  store.delete(jti);
  if (!record) return null;

  const slug = expectedTenantSlug.trim().toLowerCase();
  if (!slug || record.tenantSlug !== slug) return null;
  if (Date.now() > record.exp) return null;

  return record;
}

/** Test-only visibility into pending tickets — used by perimeter integration tests. */
export function workspaceBootstrapTicketIsPendingForTests(token: string): boolean {
  const jti = normalizeBootstrapToken(token);
  if (!jti) return false;
  purgeExpiredTickets();
  return ticketStore().has(jti);
}

/** Test-only reset — avoids cross-test leakage in Vitest. */
export function resetWorkspaceBootstrapTicketStoreForTests(): void {
  ticketStore().clear();
}
