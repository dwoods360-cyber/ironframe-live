import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { fetchTenantAssigneeRoster } from "@/app/lib/server/tenantAssigneeRoster.server";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** GET /api/tenant/assignee-roster — tenant-scoped operator list for assignee dropdowns. */
export async function GET(request: NextRequest) {
  noStore();
  try {
    const guard = await assertAuthenticatedIronguardTenantOr403(request);
    if (!guard.ok) {
      return guard.response;
    }

    const roster = await fetchTenantAssigneeRoster(guard.tenantUuid);
    return NextResponse.json({
      ok: true,
      options: roster.map(({ value, label }) => ({ value, label })),
    });
  } catch (error) {
    console.error(
      "[api/tenant/assignee-roster] roster load failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ ok: false, options: [] }, { status: 200 });
  }
}
