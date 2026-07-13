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

function supportIntakeSnapshotErrorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : "Support intake snapshot failed.";
  const status = message.includes("TARGET_TENANT_NOT_FOUND") ? 404 : 500;
  const hint = message.includes("TARGET_TENANT_NOT_FOUND")
    ? " Set IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG to an existing tenant slug (Vercel env + redeploy)."
    : undefined;
  return NextResponse.json({ error: message, hint }, { status });
}

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const snapshot = await buildSupportIntakePortalSnapshot(resolveOperationsCrmScopeSlug());
    return NextResponse.json(redactSupportIntakePortalSnapshot(snapshot));
  } catch (err) {
    return supportIntakeSnapshotErrorResponse(err);
  }
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

  try {
    const snapshot = await buildSupportIntakePortalSnapshot(resolveOperationsCrmScopeSlug());
    return NextResponse.json({
      ok: true,
      poll: result.result,
      snapshot: redactSupportIntakePortalSnapshot(snapshot),
    });
  } catch (err) {
    return supportIntakeSnapshotErrorResponse(err);
  }
}
