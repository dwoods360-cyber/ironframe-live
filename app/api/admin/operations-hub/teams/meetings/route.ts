import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  createTeamsOnlineMeeting,
  resolveTeamsMeetingByJoinUrl,
} from "@/app/lib/server/teamsGraphMeetings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    action?: "create" | "resolve";
    subject?: string;
    joinUrl?: string;
    startIso?: string;
    endIso?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const action = body.action ?? "create";

  if (action === "resolve") {
    const result = await resolveTeamsMeetingByJoinUrl(String(body.joinUrl ?? ""));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, meeting: result.meeting });
  }

  const company = String(body.subject ?? "").trim();
  const result = await createTeamsOnlineMeeting({
    subject: company || "Ironframe workflow review (15 min)",
    startIso: body.startIso,
    endIso: body.endIso,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, meeting: result.meeting });
}
