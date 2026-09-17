import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { listCatalogTenantIds } from "@/app/lib/server/cronTenantScope";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { runAuditedThreatEventWormBypass } from "@/app/lib/prisma/threatEventWormBypass";

/**
 * Master Purge API: wipes tenant-scoped ledgers per bound tenant, then deletes the tenant catalog.
 * Requires a platform administrator session. Never uses an unbound cross-tenant delete under RLS.
 */
export async function POST() {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  try {
    const tenantIds = await listCatalogTenantIds();
    let auditLogs = 0;
    let workNotes = 0;
    let threatEvents = 0;

    for (const tenantId of tenantIds) {
      const counts = await withIronguardTenant(tenantId, async (tx) => {
        const auditLogResult = await tx.auditLog.deleteMany({ where: { tenantId } });
        const workNoteResult = await tx.workNote.deleteMany({});
        const threatEventResult = await runAuditedThreatEventWormBypass({
          threatId: `TENANT_${tenantId}`,
          eventType: "ADMIN_MASTER_PURGE",
          actorUserId: auth.userId,
          existingTx: tx,
          execute: (inner) => inner.threatEvent.deleteMany({ where: { tenantId } }),
        });
        return {
          auditLogs: auditLogResult.count,
          workNotes: workNoteResult.count,
          threatEvents: threatEventResult.count,
        };
      });
      auditLogs += counts.auditLogs;
      workNotes += counts.workNotes;
      threatEvents += counts.threatEvents;
    }

    const tenantResult = await prisma.tenant.deleteMany({});

    return NextResponse.json({
      ok: true,
      message: "Purge complete (per-tenant bound wipe, then catalog delete).",
      counts: {
        tenants: tenantResult.count,
        audit_logs: auditLogs,
        work_notes: workNotes,
        threat_events: threatEvents,
      },
    });
  } catch (e) {
    console.error("[admin/purge]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Purge failed" },
      { status: 500 },
    );
  }
}
