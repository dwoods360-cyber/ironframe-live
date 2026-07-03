"use server";

import {
  resolveCommandCenterTenantScope,
  type CommandCenterTenantRow,
  type CommandCenterTenantScope,
} from "@/app/lib/auth/commandCenterTenantAccess";
import type { CommandPostWorkspaceTarget } from "@/app/lib/commandPostNavigation";
import { resolveServerCommandPostTarget } from "@/app/lib/auth/resolveCommandPostTarget.server";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";

export type { CommandCenterTenantRow, CommandCenterTenantScope, CommandPostWorkspaceTarget };

/**
 * RBAC-scoped tenants for the Global Command Center dropdown.
 * GLOBAL_ADMIN unlocks the aggregate lane on apex and may switch assigned workspaces on subdomains.
 */
export async function listCommandCenterTenants(): Promise<CommandCenterTenantRow[]> {
  const scope = await resolveCommandCenterTenantScope();
  return scope.tenants;
}

/** Tenant rows plus whether the aggregate global lane is permitted. */
export async function listCommandCenterTenantScope(): Promise<CommandCenterTenantScope> {
  return resolveCommandCenterTenantScope();
}

/** Server-resolved Command Post target for apex → tenant workspace hops. */
export async function resolveCommandPostNavigationTarget(): Promise<CommandPostWorkspaceTarget> {
  return resolveServerCommandPostTarget();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LogTenantScopeChangeInput = {
  prevUuid: string | null;
  nextUuid: string | null;
};

/**
 * Server-side AuditLog for Command Center tenant scope changes (Prisma extension resolves `tenantId`).
 */
export async function logTenantScopeChangeAction(
  input: LogTenantScopeChangeInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getSupabaseSessionUser();
    const userId = user?.id?.trim() && user.id.trim().length > 0 ? user.id.trim() : "unknown";
    const from = (input.prevUuid?.trim() ?? "") === "" ? "global" : input.prevUuid!.trim().toLowerCase();
    const to = (input.nextUuid?.trim() ?? "") === "" ? "global" : input.nextUuid!.trim().toLowerCase();
    const justification = `[TENANT_SCOPE_CHANGE] User: ${userId} | From: ${from} | To: ${to} | Status: Success`;
    const governanceUuid = to !== "global" && UUID_RE.test(to) ? to : undefined;
    await auditLogCreateLoose({
      data: {
        action: "TENANT_SCOPE_CHANGE",
        justification,
        operatorId: userId,
        threatId: null,
        isSimulation: false,
        ...(governanceUuid ? { governance_tenant_uuid: governanceUuid } : {}),
      },
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[logTenantScopeChangeAction]", e);
    return { ok: false, error: message };
  }
}
