import { NextRequest, NextResponse } from "next/server";
import { assertTenantAccess } from "@/app/utils/tenantIsolation";

export function proxy(request: NextRequest) {
  if (process.env.DISABLE_MULTI_TENANT_PROXY === "true") {
    return NextResponse.next();
  }

  const activeTenantUuid = request.headers.get("x-tenant-id");
  const targetTenantUuid =
    request.headers.get("x-target-tenant-id") ?? request.nextUrl.searchParams.get("tenantUuid");

  if (targetTenantUuid && !assertTenantAccess(activeTenantUuid, targetTenantUuid)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Tenant isolation violation: cross-tenant API access denied.",
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
