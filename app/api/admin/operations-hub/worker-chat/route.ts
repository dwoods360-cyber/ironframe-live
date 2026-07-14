import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  isOpsChatTarget,
  runOpsWorkerChat,
  type OpsWorkerChatTurn,
} from "@/app/lib/server/opsWorkerChatCore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Conversational Q&A scoped to IronBoard or one perimeter worker (advisory only — no auto DISPATCH).
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    worker?: string;
    message?: string;
    history?: OpsWorkerChatTurn[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const worker = String(body.worker ?? "").trim();
  if (!isOpsChatTarget(worker)) {
    return NextResponse.json(
      {
        error:
          "worker must be ironboard|ironleads|salesteam|success-team|support-team",
      },
      { status: 400 },
    );
  }

  const message = String(body.message ?? "").trim();
  if (message.length < 2) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (row): row is OpsWorkerChatTurn =>
            !!row &&
            (row.role === "user" || row.role === "assistant") &&
            typeof row.text === "string",
        )
        .map((row) => ({ role: row.role, text: row.text.trim().slice(0, 4000) }))
        .filter((row) => row.text.length > 0)
        .slice(-8)
    : [];

  try {
    const result = await runOpsWorkerChat({ worker, message, history });
    return NextResponse.json({ ok: true, ...result, worker, operator: auth.userId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Worker chat failed." },
      { status: 502 },
    );
  }
}
