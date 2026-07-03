import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { readLatestIrontechPostMortemForTenant } from "@/app/services/irontechPostMortem";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;
  const report = readLatestIrontechPostMortemForTenant(tenantId);
  if (!report) {
    return NextResponse.json({ ok: false, error: "No post-mortem report for tenant." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, report }, { headers: { "Cache-Control": "no-store" } });
}
