import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  redactSupportIntakePortalSnapshot,
  resolveOperationsCrmScopeSlug,
} from "@/app/lib/server/operationsApiRedaction";
import {
  buildSupportIntakePortalSnapshot,
  triggerSupportTeamPoll,
} from "@/app/lib/server/operationsTeamPortalsCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildSupportIntakePortalSnapshot(resolveOperationsCrmScopeSlug());
  return NextResponse.json(redactSupportIntakePortalSnapshot(snapshot));
}

export async function POST() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const result = await triggerSupportTeamPoll();
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Poll failed" }, { status: 502 });
  }

  const snapshot = await buildSupportIntakePortalSnapshot(resolveOperationsCrmScopeSlug());
  return NextResponse.json({
    ok: true,
    poll: result.result,
    snapshot: redactSupportIntakePortalSnapshot(snapshot),
  });
}
