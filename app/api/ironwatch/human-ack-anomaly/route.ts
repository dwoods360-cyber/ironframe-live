import { NextRequest, NextResponse } from "next/server";

import { HUMAN_ACK_ANOMALY_AUDIT_ACTION } from "@/app/lib/ironwatch/humanAckAnomalyAuditAction";
import { countTenantQuarantineHardBans } from "@/app/lib/security/quarantineLedgerRead";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Ironlock (Agent 6) witness: immutable Prisma `AuditLog` row for human anomaly acknowledgment on the Command Post.
 * Ironscribe daily synthesis includes `HUMAN_ACK_ANOMALY` in the 24h digest.
 */
export async function POST(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;

  let body: { agentName?: unknown; agentIndex?: unknown; userId?: unknown };
  try {
    body = (await request.json()) as { agentName?: unknown; agentIndex?: unknown; userId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const agentName = typeof body.agentName === "string" ? body.agentName.trim().slice(0, 120) : "";
  const agentIndex = typeof body.agentIndex === "number" && Number.isInteger(body.agentIndex) ? body.agentIndex : NaN;
  if (!agentName || !Number.isInteger(agentIndex)) {
    return NextResponse.json({ ok: false, error: "agentName_and_agentIndex_required" }, { status: 400 });
  }

  const headerId = request.headers.get("x-ironframe-user-id")?.trim().slice(0, 256) ?? "";
  const bodyId = typeof body.userId === "string" ? body.userId.trim().slice(0, 256) : "";
  const userId = headerId || bodyId || "unknown-human";

  const tenantUuid = guard.tenantUuid;
  const [cfg, hardBanCount] = await Promise.all([
    prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { stateFreezeActive: true },
    }),
    countTenantQuarantineHardBans(tenantUuid),
  ]);

  if (cfg?.stateFreezeActive === true) {
    return NextResponse.json({ ok: false, error: "state_freeze_active" }, { status: 403 });
  }
  if (hardBanCount > 0) {
    return NextResponse.json({ ok: false, error: "hard_ban_active" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const justification = `[HUMAN_ACK_ANOMALY] Agent: ${agentName} | User: ${userId} | Timestamp: ${nowIso}`;

  await auditLogCreateLoose({
    data: {
      action: HUMAN_ACK_ANOMALY_AUDIT_ACTION,
      operatorId: userId,
      justification,
      governance_tenant_uuid: tenantUuid,
      isSimulation: false,
    },
  });

  logStructuredEvent(
    "Ironlock",
    "HUMAN_ACK_ANOMALY",
    { agentName, agentIndex, userId, timestamp: nowIso },
    "info",
  );

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
