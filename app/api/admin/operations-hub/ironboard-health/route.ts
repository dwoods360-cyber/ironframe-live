import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { redactIronboardEngineHealthSnapshot } from "@/app/lib/server/operationsApiRedaction";
import { probeIronboardEngineHealth } from "@/app/lib/server/ironboardEngineHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = probeIronboardEngineHealth();
  const redacted = redactIronboardEngineHealthSnapshot(await snapshot);
  return NextResponse.json(redacted, {
    status: redacted.reachable ? 200 : 503,
  });
}
