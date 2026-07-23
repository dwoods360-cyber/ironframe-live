import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  redactSalesTeamPortalSnapshot,
  resolveSalesTeamCrmScopeSlug,
} from "@/app/lib/server/operationsApiRedaction";
import { operationsPortalErrorResponse } from "@/app/lib/server/operationsPortalHttp";
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

  try {
    const snapshot = await buildSalesTeamPortalSnapshot(resolveSalesTeamCrmScopeSlug());
    return NextResponse.json(redactSalesTeamPortalSnapshot(snapshot));
  } catch (err) {
    return operationsPortalErrorResponse(err, "Sales team snapshot");
  }
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

  try {
    const snapshot = await buildSalesTeamPortalSnapshot(resolveSalesTeamCrmScopeSlug());
    return NextResponse.json({
      ok: true,
      poll: result.result,
      snapshot: redactSalesTeamPortalSnapshot(snapshot),
    });
  } catch (err) {
    return operationsPortalErrorResponse(err, "Sales team snapshot");
  }
}
