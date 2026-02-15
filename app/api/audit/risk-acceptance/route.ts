import { NextRequest, NextResponse } from "next/server";
import { addRiskAcceptanceDecision } from "@/app/api/audit/riskAcceptanceStore";
import { appendAuditLog } from "@/app/utils/auditLogger";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const alertId = body?.alertId as string | undefined;
  const actor = (body?.actor as string | undefined) ?? "SECURITY_OPERATOR";
  const reason = (body?.reason as string | undefined) ?? "Risk accepted by operator decision.";

  if (!alertId) {
    return NextResponse.json({ ok: false, error: "alertId is required." }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const id = `risk-accept-${createdAt}-${alertId}`;

  addRiskAcceptanceDecision({
    id,
    alertId,
    actor,
    decision: "DISMISS/IGNORE",
    reason,
    createdAt,
  });

  appendAuditLog({
    action_type: "ALERT_DISMISSED",
    description: `Risk accepted for alert ${alertId}.`,
    user_id: "Dereck",
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
    timestamp: createdAt,
  });

  return NextResponse.json({
    ok: true,
    id,
    alertId,
    decision: "DISMISS/IGNORE",
    createdAt,
  });
}
