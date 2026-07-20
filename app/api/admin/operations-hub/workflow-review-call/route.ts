import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  assistWorkflowReviewQuestion,
  analyzeWorkflowReviewTranscript,
  buildWorkflowReviewCallRecap,
  runWorkflowReviewCallAssist,
  type WorkflowReviewCallRecap,
} from "@/app/lib/server/workflowReviewCallAssistCore";
import { pushWorkflowReviewRecapToCalendar } from "@/app/lib/server/workflowReviewCalendarPush";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    action?: "assist" | "analyze" | "recap" | "push-calendar" | "session";
    question?: string;
    transcript?: string;
    company?: string;
    contactName?: string;
    channel?: "teams" | "zoom" | "meet" | "other";
    recordingConsent?: boolean;
    recap?: WorkflowReviewCallRecap;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const action = body.action ?? "session";

  if (action === "assist") {
    return NextResponse.json({
      ok: true,
      assist: assistWorkflowReviewQuestion(String(body.question ?? "")),
    });
  }

  if (action === "analyze") {
    return NextResponse.json({
      ok: true,
      analysis: analyzeWorkflowReviewTranscript(String(body.transcript ?? "")),
    });
  }

  if (action === "recap") {
    const transcript = String(body.transcript ?? "").trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript buffer is empty — nothing to recap." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      recap: buildWorkflowReviewCallRecap({
        transcript,
        company: body.company,
        contactName: body.contactName,
        channel: body.channel ?? "teams",
      }),
    });
  }

  if (action === "push-calendar") {
    const recap =
      body.recap ??
      (body.transcript?.trim()
        ? buildWorkflowReviewCallRecap({
            transcript: body.transcript,
            company: body.company,
            contactName: body.contactName,
            channel: body.channel ?? "teams",
          })
        : null);
    if (!recap || recap.actionItems.length === 0) {
      return NextResponse.json(
        { error: "No recap action items to push. Generate a call recap first." },
        { status: 400 },
      );
    }
    try {
      const result = await pushWorkflowReviewRecapToCalendar(recap);
      return NextResponse.json({
        ok: true,
        ...result,
        message: `Calendar: created ${result.created}, updated ${result.updated}. Open Ops Hub → Calendar.`,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Calendar push failed." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    runWorkflowReviewCallAssist({
      company: String(body.company ?? "").trim() || "Prospect",
      contactName: body.contactName?.trim(),
      channel: body.channel ?? "teams",
      recordingConsent: Boolean(body.recordingConsent),
      transcript: body.transcript,
      liveQuestion: body.question,
    }),
  );
}
