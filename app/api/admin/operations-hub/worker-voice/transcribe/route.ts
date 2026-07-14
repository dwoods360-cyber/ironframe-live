import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { transcribeOpsWorkerAudio } from "@/app/lib/server/opsWorkerChatCore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Gemini STT for Ops Hub worker portal PTT (no wake listening). */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error, transcript: "" }, { status: 403 });
  }

  let body: { audioBase64?: string; mimeType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", transcript: "" }, { status: 400 });
  }

  try {
    const result = await transcribeOpsWorkerAudio({
      audioBase64: String(body.audioBase64 ?? ""),
      mimeType: body.mimeType,
    });
    return NextResponse.json({ ok: true, ...result, operator: auth.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TRANSCRIBE_FAILED";
    const status =
      message === "AUDIO_REQUIRED" || message === "AUDIO_TOO_LARGE" ? 400 : 502;
    return NextResponse.json({ error: message, transcript: "" }, { status });
  }
}
