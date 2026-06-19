import { NextRequest, NextResponse } from "next/server";

import {
  resolveTrainerApiKey,
  synthesizeTrainerSession,
} from "@/app/lib/server/trainerAgentConsoleCore";
import { assertIronguardApiTenantOr403 } from "@/app/lib/security/ironguardApiGuard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const guard = await assertIronguardApiTenantOr403(req);
    if (!guard.ok) {
      return guard.response;
    }

    let body: { topic?: unknown; message?: unknown };
    try {
      body = (await req.json()) as { topic?: unknown; message?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    if (!topic) {
      return NextResponse.json(
        { error: "Invalid payload: 'topic' string is required." },
        { status: 400 },
      );
    }

    const message = typeof body.message === "string" ? body.message.trim() : undefined;

    if (!resolveTrainerApiKey()) {
      console.error("[Trainer Agent] Missing Gemini orchestration credentials.");
      return NextResponse.json(
        { error: "Trainer engine offline. Intelligence cluster keys unassigned." },
        { status: 503 },
      );
    }

    const result = await synthesizeTrainerSession({
      tenantId: guard.tenantUuid!,
      topic,
      message,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "TOPIC_REQUIRED") {
      return NextResponse.json({ error: "Invalid payload: 'topic' string is required." }, { status: 400 });
    }

    const details = err instanceof Error ? err.message : "Unknown exception.";
    console.error("[Trainer Agent] Critical routing boundary exception:", err);
    return NextResponse.json(
      { error: "Internal Trainer Routing Error", details },
      { status: 500 },
    );
  }
}
