import "server-only";

import { createHmac, randomBytes } from "crypto";

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
  __ironframeWorkspaceBootstrapUsed?: Set<string>;
};

function ticketStore(): TicketStore {
  if (!globalStore.__ironframeWorkspaceBootstrapTickets) {
    globalStore.__ironframeWorkspaceBootstrapTickets = new Map();
  }
  return globalStore.__ironframeWorkspaceBootstrapTickets;
}

function usedTokenStore(): Set<string> {
  if (!globalStore.__ironframeWorkspaceBootstrapUsed) {
    globalStore.__ironframeWorkspaceBootstrapUsed = new Set();
  }
  return globalStore.__ironframeWorkspaceBootstrapUsed;
}

function bootstrapSigningSecret(): string {
  const configured =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Workspace bootstrap signing secret is not configured.");
  }
  return "dev-workspace-bootstrap";
}

function mintStatelessBootstrapToken(record: WorkspaceBootstrapTicket): string {
  const body = Buffer.from(JSON.stringify(record)).toString("base64url");
  const sig = createHmac("sha256", bootstrapSigningSecret()).update(body).digest("base64url");
  return `bt_${body}.${sig}`;
}

function consumeStatelessBootstrapToken(
  token: string,
  expectedTenantSlug: string,
): WorkspaceBootstrapTicket | null {
  const trimmed = token.trim();
  if (!trimmed.startsWith("bt_")) return null;
  const rest = trimmed.slice(3);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  const expectedSig = createHmac("sha256", bootstrapSigningSecret()).update(body).digest("base64url");
  if (sig !== expectedSig) return null;

  let record: WorkspaceBootstrapTicket;
  try {
    record = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as WorkspaceBootstrapTicket;
  } catch {
    return null;
  }

  const slug = expectedTenantSlug.trim().toLowerCase();
  const used = usedTokenStore();
  if (!slug || record.tenantSlug !== slug) {
    used.add(trimmed);
    return null;
  }
  if (Date.now() > record.exp) {
    used.add(trimmed);
    return null;
  }

  if (used.has(trimmed)) return null;
  used.add(trimmed);
  return record;
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
  const payload = trimmed.slice(3);
  if (!payload) return null;
  if (payload.includes(".")) return trimmed;
  if (payload.length < 16) return null;
  return payload;
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

  const tenantSlug = input.tenantSlug.trim().toLowerCase();

  const record: WorkspaceBootstrapTicket = {
    userId: input.userId.trim(),
    userEmail: input.userEmail?.trim() || null,
    tenantSlug,
    tenantUuid: input.tenantUuid.trim(),
    accessToken: input.accessToken.trim(),
    refreshToken: input.refreshToken.trim(),
    nextPath: input.nextPath.trim() || "/",
    exp: nowMs + WORKSPACE_BOOTSTRAP_TTL_MS,
  };

  const jti = randomBytes(32).toString("base64url");
  ticketStore().set(jti, record);

  return mintStatelessBootstrapToken(record);
}

/**
 * Single-use redemption — ticket is shredded on first lookup regardless of outcome.
 * `expectedTenantSlug` must match the host-bound workspace slug.
 */
export function consumeWorkspaceBootstrapTicket(
  token: string,
  expectedTenantSlug: string,
): WorkspaceBootstrapTicket | null {
  const trimmed = token.trim();
  if (!trimmed.startsWith("bt_")) return null;

  purgeExpiredTickets();

  if (trimmed.includes(".")) {
    return consumeStatelessBootstrapToken(trimmed, expectedTenantSlug);
  }

  const jti = normalizeBootstrapToken(trimmed);
  if (!jti) return null;

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
  const trimmed = token.trim();
  if (!trimmed.startsWith("bt_")) return false;
  purgeExpiredTickets();
  if (trimmed.includes(".")) {
    return !usedTokenStore().has(trimmed);
  }
  const jti = normalizeBootstrapToken(trimmed);
  if (!jti) return false;
  return ticketStore().has(jti);
}

/** Test-only reset — avoids cross-test leakage in Vitest. */
export function resetWorkspaceBootstrapTicketStoreForTests(): void {
  ticketStore().clear();
  usedTokenStore().clear();
}
