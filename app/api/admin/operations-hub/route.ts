import { NextResponse } from "next/server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { buildOperationsHubSnapshot } from "@/app/lib/server/operationsHubCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const snapshot = await buildOperationsHubSnapshot();
  return NextResponse.json(snapshot);
}
