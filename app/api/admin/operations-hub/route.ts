import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { redactOperationsHubSnapshot } from "@/app/lib/server/operationsApiRedaction";
import { buildOperationsHubSnapshot } from "@/app/lib/server/operationsHubCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildOperationsHubSnapshot();
  return NextResponse.json(redactOperationsHubSnapshot(snapshot));
}
