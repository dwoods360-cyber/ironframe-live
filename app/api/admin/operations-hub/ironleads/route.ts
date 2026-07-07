import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  redactIronleadsPortalSnapshot,
} from "@/app/lib/server/operationsApiRedaction";
import {
  buildIronleadsPortalSnapshot,
  triggerIronleadsHarvest,
} from "@/app/lib/server/operationsTeamPortalsCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildIronleadsPortalSnapshot();
  return NextResponse.json(redactIronleadsPortalSnapshot(snapshot));
}

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: { scoutOnly?: boolean; skipIngress?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await triggerIronleadsHarvest(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Harvest failed" }, { status: 502 });
  }

  const snapshot = await buildIronleadsPortalSnapshot();
  return NextResponse.json({
    ok: true,
    harvest: result.result,
    snapshot: redactIronleadsPortalSnapshot(snapshot),
  });
}
