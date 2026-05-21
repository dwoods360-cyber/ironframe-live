"use server";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import prisma from "@/lib/prisma";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

export type CommandCenterTenantRow = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  aleBaselineCents: string;
};

/**
 * All tenants for Global Command Center dropdown — name/slug/industry from DB (cross-industry testing).
 */
export async function listCommandCenterTenants(): Promise<CommandCenterTenantRow[]> {
  const rows = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      ale_baseline: true,
    },
    orderBy: { name: "asc" },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    industry: t.industry,
    aleBaselineCents: t.ale_baseline.toString(),
  }));
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
