import { NextResponse } from "next/server";

import { fetchPendingApprovalDrafts } from "@/app/lib/server/approvalQueueCore";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const drafts = await fetchPendingApprovalDrafts();
  return NextResponse.json({
    drafts: drafts.map(({ tenantId: _t, contactId: _c, contactEmail: _e, ...rest }) => rest),
    queueDepth: drafts.length,
  });
}
