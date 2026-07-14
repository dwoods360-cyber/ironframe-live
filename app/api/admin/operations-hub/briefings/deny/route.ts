import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { denyBriefingQueueDraftCore } from "@/app/lib/server/denyBriefingQueueDraftCore";

export const dynamic = "force-dynamic";

/**
 * Operator deny — remove a quarantined draft from Ops Hub approve/deny desks.
 * Does not publish. Durable denial is stored in Postgres.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: { filename?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await denyBriefingQueueDraftCore({
    filename: body.filename ?? "",
    operator: auth.userId,
    reason: body.reason,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ...result,
      message: `Denied ${result.filename} — hidden from Briefings / Newsletters approval desks.`,
    },
    { status: 200 },
  );
}
