import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  redactSalesTeamPortalSnapshot,
  resolveSalesTeamCrmScopeSlug,
} from "@/app/lib/server/operationsApiRedaction";
import { operationsPortalErrorResponse } from "@/app/lib/server/operationsPortalHttp";
import { requeueSalesteamApprovalDrafts } from "@/app/lib/server/salesteamDraftRequeueCore";
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

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let action = "poll";
  let companyIncludes: string | undefined;
  try {
    const body = (await request.json()) as { action?: string; companyIncludes?: string };
    if (typeof body.action === "string" && body.action.trim()) {
      action = body.action.trim().toLowerCase();
    }
    if (typeof body.companyIncludes === "string" && body.companyIncludes.trim()) {
      companyIncludes = body.companyIncludes.trim();
    }
  } catch {
    action = "poll";
  }

  if (action === "requeue-drafts") {
    try {
      const requeue = await requeueSalesteamApprovalDrafts({ companyIncludes });
      const snapshot = await buildSalesTeamPortalSnapshot(resolveSalesTeamCrmScopeSlug());
      return NextResponse.json({
        ok: requeue.ok,
        requeue,
        snapshot: redactSalesTeamPortalSnapshot(snapshot),
      });
    } catch (err) {
      return operationsPortalErrorResponse(err, "Sales team requeue");
    }
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
