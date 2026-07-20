import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { holdBriefingQueueDraftCore } from "@/app/lib/server/holdBriefingQueueDraftCore";

export const dynamic = "force-dynamic";

/**
 * Operator hold — park a quarantined draft for later reading.
 * Does not Approve, Deny, publish, or delete the file.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: { filename?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await holdBriefingQueueDraftCore({
    filename: body.filename ?? "",
    operator: auth.userId,
    note: body.note,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ...result,
      message: `Held ${result.filename} — still in queue for later reading (not approved or denied).`,
    },
    { status: 200 },
  );
}
