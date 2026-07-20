import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { getTeamsGraphConnectionStatus } from "@/app/lib/server/teamsGraphAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  return NextResponse.json({ ok: true, ...getTeamsGraphConnectionStatus() });
}
