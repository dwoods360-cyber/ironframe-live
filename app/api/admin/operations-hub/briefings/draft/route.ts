import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { readBriefingQueueDraftCore } from "@/app/lib/server/readBriefingQueueDraftCore";

export const dynamic = "force-dynamic";

/**
 * Operator read — return quarantined draft markdown for Ops Hub preview.
 * Does not promote, deny, or compile.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const filename = request.nextUrl.searchParams.get("filename") ?? "";
  const result = readBriefingQueueDraftCore(filename);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result, { status: 200 });
}
