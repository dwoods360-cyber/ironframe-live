import { NextResponse } from "next/server";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { readLatestIrontechPostMortemForTenant } from "@/app/services/irontechPostMortem";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 401 });
  }
  const report = readLatestIrontechPostMortemForTenant(tenantId);
  if (!report) {
    return NextResponse.json({ ok: false, error: "No post-mortem report for tenant." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, report }, { headers: { "Cache-Control": "no-store" } });
}
