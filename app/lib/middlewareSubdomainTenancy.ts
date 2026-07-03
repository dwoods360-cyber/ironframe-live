import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  IRONFRAME_HOST_TENANT_SLUG_HEADER,
  IRONFRAME_HOST_TENANT_UUID_HEADER,
  isSubdomainTenancyEnabled,
  pathTenantSlugFromPathname,
  resolveTenantSlugFromRequestHost,
  tenantUuidFromSlug,
} from "@/app/lib/tenantSubdomain";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function internalGatesSecret(): string | null {
  return (
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim() ||
    null
  );
}

async function resolveHostTenantUuid(
  request: NextRequest,
  hostSlug: string,
): Promise<string | null> {
  const seeded = tenantUuidFromSlug(hostSlug);
  if (seeded) return seeded;

  const secret = internalGatesSecret();
  if (!secret) return null;

  try {
    const url = new URL("/api/internal/tenant-slug-resolve", request.nextUrl.origin);
    url.searchParams.set("slug", hostSlug);
    const res = await fetch(url.toString(), {
      headers: { "x-ironframe-internal-gates": secret },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; tenant?: { id?: string } };
    const id = body.tenant?.id?.trim();
    return id || null;
  } catch {
    return null;
  }
}

function stripConflictingTenantPath(pathname: string, hostSlug: string): string | null {
  const pathSlug = pathTenantSlugFromPathname(pathname);
  if (!pathSlug || pathSlug === hostSlug) return null;
  const rest = pathname.replace(new RegExp(`^/${pathSlug}(?=/|$)`), "") || "/";
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** Preserve browser-facing host when Next dev normalizes `request.nextUrl` to localhost. */
function browserFacingRequestOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

function mergeCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });
  return target;
}

/**
 * Host-bound tenant envelope: subdomain → scope cookie + request headers; block cross-tenant path prefixes.
 */
function isApexLocalRegistrationBypass(request: NextRequest, host: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const pathname = request.nextUrl.pathname;
  const isRegistration =
    pathname === "/register/setup" || pathname === "/api/register/public-intake";
  if (!isRegistration) return false;
  const hostname = host.split(":")[0]?.trim().toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export async function applySubdomainTenancy(
  request: NextRequest,
  baseResponse: NextResponse,
): Promise<NextResponse> {
  if (!isSubdomainTenancyEnabled()) {
    return baseResponse;
  }

  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    "";

  if (isApexLocalRegistrationBypass(request, host)) {
    return baseResponse;
  }

  const hostSlug = resolveTenantSlugFromRequestHost(host);
  if (!hostSlug) {
    return baseResponse;
  }

  const hostUuid = await resolveHostTenantUuid(request, hostSlug);

  const pathname = request.nextUrl.pathname;
  const conflictPath = stripConflictingTenantPath(pathname, hostSlug);
  if (conflictPath && conflictPath !== pathname) {
    const redirectUrl = new URL(
      `${conflictPath}${request.nextUrl.search}`,
      browserFacingRequestOrigin(request),
    );
    const redirect = NextResponse.redirect(redirectUrl);
    return mergeCookies(baseResponse, redirect);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(IRONFRAME_HOST_TENANT_SLUG_HEADER, hostSlug);
  if (hostUuid) {
    requestHeaders.set(IRONFRAME_HOST_TENANT_UUID_HEADER, hostUuid);
    if (pathname.startsWith("/api/") && !request.headers.get("x-tenant-id")) {
      requestHeaders.set("x-tenant-id", hostUuid);
    }
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (hostUuid) {
    const cookieTenant = request.cookies.get(IRONFRAME_TENANT_COOKIE)?.value?.trim();
    if (cookieTenant !== hostUuid && cookieTenant?.toLowerCase() !== hostSlug) {
      response.cookies.set(IRONFRAME_TENANT_COOKIE, hostUuid, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: TENANT_COOKIE_MAX_AGE,
      });
    }
  }

  return mergeCookies(baseResponse, response);
}
