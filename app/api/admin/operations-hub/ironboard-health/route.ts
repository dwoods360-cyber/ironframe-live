import { NextResponse } from "next/server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { probeIronboardEngineHealth } from "@/app/lib/server/ironboardEngineHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await probeIronboardEngineHealth();
  return NextResponse.json(snapshot, {
    status: snapshot.reachable ? 200 : 503,
  });
}
