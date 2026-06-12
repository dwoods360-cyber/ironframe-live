import { NextResponse } from "next/server";
import { resolveDashboardAccess } from "@/app/lib/auth/dashboardRoleAccess";

export const dynamic = "force-dynamic";

/** Lightweight session + RBAC probe for client redirects after sign-in. */
export async function GET() {
  const access = await resolveDashboardAccess();
  return NextResponse.json(
    {
      status: access.status,
      tenantUuid: access.status === "allowed" || access.status === "pending" ? access.tenantUuid : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
