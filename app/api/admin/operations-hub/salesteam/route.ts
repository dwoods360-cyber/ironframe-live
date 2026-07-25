import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { queueInboundLeadApprovalDraft } from "@/app/lib/server/inboundLeadOpsCore";
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
  let force = false;
  let inboundSlug: string | undefined;
  try {
    const body = (await request.json()) as {
      action?: string;
      companyIncludes?: string;
      force?: boolean;
      slug?: string;
    };
    if (typeof body.action === "string" && body.action.trim()) {
      action = body.action.trim().toLowerCase();
    }
    if (typeof body.companyIncludes === "string" && body.companyIncludes.trim()) {
      companyIncludes = body.companyIncludes.trim();
    }
    force = body.force === true;
    if (typeof body.slug === "string" && body.slug.trim()) {
      inboundSlug = body.slug.trim().toLowerCase();
    }
  } catch {
    action = "poll";
  }

  if (action === "queue-inbound-draft") {
    if (!inboundSlug) {
      return NextResponse.json({ error: "slug is required." }, { status: 400 });
    }
    try {
      const queued = await queueInboundLeadApprovalDraft({ slug: inboundSlug });
      const snapshot = await buildSalesTeamPortalSnapshot(resolveSalesTeamCrmScopeSlug());
      return NextResponse.json({
        ok: true,
        queued,
        approvalsHref: "/dashboard/admin/approvals?kind=SALES",
        snapshot: redactSalesTeamPortalSnapshot(snapshot),
      });
    } catch (err) {
      return operationsPortalErrorResponse(err, "Queue inbound draft");
    }
  }

  if (action === "requeue-drafts") {
    try {
      const requeue = await requeueSalesteamApprovalDrafts({ companyIncludes, force });
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
