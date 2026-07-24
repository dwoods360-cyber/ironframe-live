import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  logIcpShortlistTouch,
  listIcpShortlistTouches,
  type IcpTouchChannel,
  type IcpTouchStage,
} from "@/app/lib/server/icpShortlistTouchLogCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }
  try {
    const rows = await listIcpShortlistTouches();
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list touches." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: {
    touch?: IcpTouchStage;
    channel?: IcpTouchChannel;
    company?: string;
    interactionId?: string;
    dealId?: string;
    to?: string;
    trigger?: string;
    nextTouchNote?: string;
    occurredAt?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const result = await logIcpShortlistTouch({
      touch: body.touch ?? "TOUCH1",
      channel: body.channel ?? "EMAIL",
      company: String(body.company ?? ""),
      interactionId: body.interactionId,
      dealId: body.dealId,
      to: body.to,
      trigger: body.trigger,
      nextTouchNote: body.nextTouchNote,
      occurredAt: body.occurredAt,
      loggedBy: auth.userId,
    });
    return NextResponse.json({
      ok: true,
      created: result.created,
      row: result.row,
      message: result.created
        ? `Logged ${result.row.touch} for ${result.row.company}.`
        : `Already logged ${result.row.touch} for ${result.row.company}.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log touch." },
      { status: 400 },
    );
  }
}
