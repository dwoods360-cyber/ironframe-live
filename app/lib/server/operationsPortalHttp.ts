import "server-only";

import { NextResponse } from "next/server";

/** JSON error response for perimeter ops portal APIs — never empty bodies. */
export function operationsPortalErrorResponse(err: unknown, label: string): NextResponse {
  const message = err instanceof Error ? err.message : `${label} failed.`;
  const misconfigured =
    message.includes("TARGET_TENANT_NOT_FOUND") ||
    message.includes("IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG");
  return NextResponse.json(
    {
      error: message,
      hint: misconfigured
        ? " Set IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG to an existing tenant slug in Vercel Production, then redeploy."
        : undefined,
    },
    { status: misconfigured ? 404 : 500 },
  );
}
