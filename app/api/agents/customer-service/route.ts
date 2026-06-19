import { NextRequest, NextResponse } from "next/server";

import {
  CUSTOMER_SERVICE_QUEUED_MESSAGE,
  logPendingSupportConsoleDraft,
  resolveCustomerServiceApiKey,
  resolveSupportConsoleContact,
  synthesizeCustomerServiceConsoleReply,
} from "@/app/lib/server/customerServiceConsoleCore";
import { assertIronguardApiTenantOr403 } from "@/app/lib/security/ironguardApiGuard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const guard = await assertIronguardApiTenantOr403(req);
    if (!guard.ok) {
      return guard.response;
    }

    let body: { message?: unknown };
    try {
      body = (await req.json()) as { message?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { message } = body;
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

    if (!resolveCustomerServiceApiKey()) {
      console.error(
        "Missing core Gemini orchestration credentials in environment container.",
      );
      return NextResponse.json(
        { reply: "Support engine offline. Intelligence cluster keys unassigned." },
        { status: 503 },
      );
    }

    const tenantUuid = guard.tenantUuid;
    if (!tenantUuid) {
      return NextResponse.json({ error: "Tenant context unresolved." }, { status: 403 });
    }

    const proposedReply = await synthesizeCustomerServiceConsoleReply(trimmedMessage);
    const contact = await resolveSupportConsoleContact(tenantUuid);
    const interactionId = await logPendingSupportConsoleDraft({
      tenantId: tenantUuid,
      contactId: contact.id,
      inquiry: trimmedMessage,
      proposedReply,
    });

    return NextResponse.json({
      status: "QUEUED",
      interactionId,
      reply: CUSTOMER_SERVICE_QUEUED_MESSAGE,
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
