import type { NextRequest } from "next/server";

/** Preserve browser-facing host when Next dev normalizes `request.nextUrl` to localhost. */
export function browserFacingRequestOrigin(
  request: Pick<NextRequest, "headers" | "nextUrl">,
): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

export function browserFacingUrl(
  request: Pick<NextRequest, "headers" | "nextUrl">,
  pathname: string,
  search = "",
): URL {
  return new URL(`${pathname}${search}`, browserFacingRequestOrigin(request));
}

export function browserFacingOriginFromHeaders(
  headers: Headers,
  fallbackOrigin = "http://localhost:3000",
): string {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headers.get("host")?.trim();
  if (!host) return fallbackOrigin.replace(/\/+$/, "");
  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return `${proto}://${host}`;
}
