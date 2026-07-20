import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { pollTeamsMeetingTranscript } from "@/app/lib/server/teamsGraphMeetings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: { meetingId?: string; previousText?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await pollTeamsMeetingTranscript({
    meetingId: String(body.meetingId ?? ""),
    previousText: body.previousText,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
