export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { fetchTenantAuditLedgerRows } from "@/app/actions/auditActions";
import { assertIronguardApiTenantOr403 } from "@/app/lib/security/ironguardApiGuard";

/**
 * GET /api/audit/ledger-feed — tenant-scoped AuditLog rows for Audit Intelligence polling.
 * Requires `x-tenant-id` (same Ironguard rules as `/api/dashboard`).
 */
export async function GET(request: NextRequest) {
  noStore();
  const guard = await assertIronguardApiTenantOr403(request);
  if (!guard.ok) {
    return guard.response;
  }

  const take = Math.min(
    200,
    Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10) || 100),
  );

  const rows = await fetchTenantAuditLedgerRows(guard.tenantUuid, take);
  return NextResponse.json(
    { rows },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
