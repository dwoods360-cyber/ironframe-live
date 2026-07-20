import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { resumeBriefingQueueDraftCore } from "@/app/lib/server/holdBriefingQueueDraftCore";

export const dynamic = "force-dynamic";

/**
 * Operator resume — clear Hold so the draft returns to the active Approve/Deny desk.
 * Does not publish or deny.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: { filename?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await resumeBriefingQueueDraftCore({
    filename: body.filename ?? "",
    operator: auth.userId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ...result,
      message: `Resumed ${result.filename} — back on the active Approve / Deny desk.`,
    },
    { status: 200 },
  );
}
