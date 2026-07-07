import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  redactSalesTeamPortalSnapshot,
  resolveOperationsCrmScopeSlug,
} from "@/app/lib/server/operationsApiRedaction";
import {
  buildSalesTeamPortalSnapshot,
  triggerSalesTeamPoll,
} from "@/app/lib/server/operationsTeamPortalsCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildSalesTeamPortalSnapshot(resolveOperationsCrmScopeSlug());
  return NextResponse.json(redactSalesTeamPortalSnapshot(snapshot));
}

export async function POST() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const result = await triggerSalesTeamPoll();
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Poll failed" }, { status: 502 });
  }

  const snapshot = await buildSalesTeamPortalSnapshot(resolveOperationsCrmScopeSlug());
  return NextResponse.json({
    ok: true,
    poll: result.result,
    snapshot: redactSalesTeamPortalSnapshot(snapshot),
  });
}
