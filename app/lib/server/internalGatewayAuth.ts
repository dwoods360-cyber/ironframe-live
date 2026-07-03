import "server-only";

import { NextResponse } from "next/server";

const BEARER_PREFIX = "Bearer ";

export function resolveInternalGatewaySecret(): string | undefined {
  return (
    process.env.INTERNAL_GATEWAY_SECRET_KEY?.trim() ||
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    undefined
  );
}

/** Fail-closed Bearer gate for IronBoard → Ironframe documentation ingress. */
export function checkInternalGatewayBearerAuth(request: Request): boolean {
  const secret = resolveInternalGatewaySecret();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader?.startsWith(BEARER_PREFIX)) return false;

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 && token === secret;
}

export function internalGatewayUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Unauthorized Ingress Portal Access Blocked" },
    { status: 401 },
  );
}
