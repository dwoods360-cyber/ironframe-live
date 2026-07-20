import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { buildTeamsConnectUrl } from "@/app/lib/server/teamsGraphAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const result = buildTeamsConnectUrl(auth.userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.redirect(result.url);
}
