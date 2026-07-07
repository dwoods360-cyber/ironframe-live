import { NextRequest, NextResponse } from "next/server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  buildSuccessTeamPortalSnapshot,
  triggerSuccessTeamPoll,
} from "@/app/lib/server/operationsTeamPortalsCore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const tenantSlug = request.nextUrl.searchParams.get("tenantSlug")?.trim() || "bwc";
  const snapshot = await buildSuccessTeamPortalSnapshot(tenantSlug);
  return NextResponse.json(snapshot);
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const result = await triggerSuccessTeamPoll();
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Poll failed" }, { status: 502 });
  }

  const tenantSlug = request.nextUrl.searchParams.get("tenantSlug")?.trim() || "bwc";
  const snapshot = await buildSuccessTeamPortalSnapshot(tenantSlug);
  return NextResponse.json({ ok: true, poll: result.result, snapshot });
}
