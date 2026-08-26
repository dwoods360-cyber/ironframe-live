import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { listRecentOutreachReplyAlerts } from "@/app/lib/server/outreachReplyReceiptCore";

export const dynamic = "force-dynamic";

/** Ops Hub poll — recent outreach-reply activities for audible chime. */
export async function GET(request: Request) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const url = new URL(request.url);
  const minutes = Math.min(
    120,
    Math.max(1, Number(url.searchParams.get("minutes") || 15) || 15),
  );

  const alerts = await listRecentOutreachReplyAlerts(minutes * 60 * 1000);
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    alerts,
  });
}
