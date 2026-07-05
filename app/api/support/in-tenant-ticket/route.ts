import { NextRequest, NextResponse } from "next/server";

import {
  dispatchInTenantSupportTicket,
  parseInTenantSupportTicketInput,
} from "@/app/lib/server/customerServiceConsoleCore";
import { buildInTenantSupportTelemetry } from "@/app/lib/server/inTenantSupportTelemetry";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const guard = await assertAuthenticatedIronguardTenantOr403(req);
    if (!guard.ok) {
      return guard.response;
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const ticket = parseInTenantSupportTicketInput(body);
    if (!ticket) {
      return NextResponse.json(
        { error: "Invalid payload: urgency and userNotes are required." },
        { status: 400 },
      );
    }

    if (
      (ticket.urgency === "AUDIT_BLOCKER" || ticket.urgency === "DATA_INTEGRITY") &&
      !ticket.attachTelemetry
    ) {
      return NextResponse.json(
        { error: "Diagnostic telemetry attachment is required for this urgency level." },
        { status: 400 },
      );
    }

    const tenantUuid = guard.tenantUuid;
    if (!tenantUuid) {
      return NextResponse.json({ error: "Tenant context unresolved." }, { status: 403 });
    }

    const user = await getSupabaseSessionUser();
    const telemetry = ticket.attachTelemetry
      ? await buildInTenantSupportTelemetry({
          tenantUuid,
          userId: guard.userId ?? user?.id ?? null,
          userEmail: user?.email ?? null,
          clientContext: ticket.context,
        })
      : null;

    const result = await dispatchInTenantSupportTicket({
      tenantId: tenantUuid,
      ticket,
      telemetry,
    });

    return NextResponse.json({
      status: "DISPATCHED",
      interactionId: result.interactionId,
      reply: result.reply,
      telemetryCaptured: Boolean(telemetry),
    });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Unknown exception.";
    console.error("Critical exception inside in-tenant support ticket ingress:", err);
    return NextResponse.json(
      { error: "Internal Gateway Routing Error", details },
      { status: 500 },
    );
  }
}
