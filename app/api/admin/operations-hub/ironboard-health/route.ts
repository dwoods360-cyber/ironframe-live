import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { resolveBoardroomEmbedUrl } from "@/app/lib/ironboardConsolePaths";
import { redactIronboardEngineHealthSnapshot } from "@/app/lib/server/operationsApiRedaction";
import { probeIronboardEngineHealth } from "@/app/lib/server/ironboardEngineHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await probeIronboardEngineHealth();
  const redacted = redactIronboardEngineHealthSnapshot(snapshot);
  return NextResponse.json(
    {
      ...redacted,
      boardroomEmbedUrl: resolveBoardroomEmbedUrl(snapshot.upstreamBase, snapshot.reachable),
    },
    {
      status: redacted.reachable ? 200 : 503,
    },
  );
}
