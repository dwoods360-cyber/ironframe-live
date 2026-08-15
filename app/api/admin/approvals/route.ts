import { NextResponse } from "next/server";

import {
  APPROVAL_QUEUE_FETCH_CAP,
  countPendingApprovalDraftRows,
  fetchPendingApprovalDrafts,
} from "@/app/lib/server/approvalQueueCore";
import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const [drafts, queueTotal] = await Promise.all([
    fetchPendingApprovalDrafts(),
    countPendingApprovalDraftRows(),
  ]);
  return NextResponse.json({
    // Keep tenant/contact IDs server-side; expose destination fields for HITL dry-run edits.
    drafts: drafts.map(({ tenantId: _t, contactId: _c, ...rest }) => rest),
    queueDepth: drafts.length,
    queueTotal,
    queueCap: APPROVAL_QUEUE_FETCH_CAP,
    queueCapped: queueTotal > APPROVAL_QUEUE_FETCH_CAP,
  });
}
