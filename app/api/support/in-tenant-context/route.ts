import { NextRequest, NextResponse } from "next/server";

import type { InTenantSupportTelemetry } from "@/app/types/inTenantSupportTelemetry";
import { buildInTenantSupportTelemetry } from "@/app/lib/server/inTenantSupportTelemetry";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

export const dynamic = "force-dynamic";

function readClientContext(request: NextRequest): { surface?: string; path?: string } {
  const url = new URL(request.url);
  return {
    surface: url.searchParams.get("surface")?.trim() || undefined,
    path: url.searchParams.get("path")?.trim() || undefined,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<InTenantSupportTelemetry | { error: string }>> {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) {
    return guard.response as NextResponse<{ error: string }>;
  }

  const tenantUuid = guard.tenantUuid;
  if (!tenantUuid) {
    return NextResponse.json({ error: "Tenant context unresolved." }, { status: 403 });
  }

  const user = await getSupabaseSessionUser();
  const telemetry = await buildInTenantSupportTelemetry({
    tenantUuid,
    userId: guard.userId ?? user?.id ?? null,
    userEmail: user?.email ?? null,
    clientContext: readClientContext(request),
  });

  if (!telemetry) {
    return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
  }

  return NextResponse.json(telemetry, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
