import { NextRequest, NextResponse } from "next/server";

import {
  CUSTOMER_SERVICE_QUEUED_MESSAGE,
  logSupportConsoleIntake,
  resolveSupportConsoleContact,
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

    let body: { message?: unknown; context?: { surface?: unknown; path?: unknown } };
    try {
      body = (await req.json()) as { message?: unknown; context?: { surface?: unknown; path?: unknown } };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { message, context } = body;
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid payload: 'message' string is required." },
        { status: 400 },
      );
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return NextResponse.json(
        { error: "Invalid payload: 'message' string is required." },
        { status: 400 },
      );
    }

    const tenantUuid = guard.tenantUuid;
    if (!tenantUuid) {
      return NextResponse.json({ error: "Tenant context unresolved." }, { status: 403 });
    }

    const user = await getSupabaseSessionUser();
    const telemetry = await buildInTenantSupportTelemetry({
      tenantUuid,
      userId: guard.userId ?? user?.id ?? null,
      userEmail: user?.email ?? null,
      clientContext: {
        surface: typeof context?.surface === "string" ? context.surface : undefined,
        path: typeof context?.path === "string" ? context.path : undefined,
      },
    });

    const contact = await resolveSupportConsoleContact(tenantUuid);
    const interactionId = await logSupportConsoleIntake({
      tenantId: tenantUuid,
      contactId: contact.id,
      inquiry: trimmedMessage,
      telemetry,
    });

    return NextResponse.json({
      status: "QUEUED",
      interactionId,
      reply: CUSTOMER_SERVICE_QUEUED_MESSAGE,
      telemetryCaptured: Boolean(telemetry),
    });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Unknown exception.";
    console.error("Critical exception inside Customer Service routing boundary:", err);
    return NextResponse.json(
      { error: "Internal Gateway Routing Error", details },
      { status: 500 },
    );
  }
}
