import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ensureCorporateInviteRoleAssignment } from "@/app/lib/auth/corporateInviteProvisioning";
import { readTenantSlugFromUserMetadata } from "@/app/lib/auth/tenantInviteMetadata";
import { sanitizeAuthNextPath } from "@/app/lib/auth/publicAppUrl";
import { resolveBrowserFacingRequestOrigin } from "@/app/lib/auth/publicAppUrl.server";
import { workspaceActivationNextParam } from "@/app/lib/auth/workspaceActivationLanding";
import {
  assertWorkspaceBootstrapMembership,
  consumeWorkspaceBootstrapTicket,
} from "@/app/lib/auth/workspaceBootstrapTicket";
import { resolveBootstrapSessionTokens } from "@/app/lib/auth/resolveBootstrapSessionTokens.server";
import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { buildTenantSubdomainOrigin, tenantSlugFromHost, tenantUuidFromSlug, isApexControlPlaneHost } from "@/app/lib/tenantSubdomain";

const IRONFRAME_TENANT_COOKIE = "ironframe-tenant";
const SIMULATION_MODE_COOKIE = "ironframe-simulation-mode";
const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolvePostActivationDestination(request: NextRequest, nextPath: string): URL {
  const url = new URL(nextPath, resolveBrowserFacingRequestOrigin(request));
  const barePath = nextPath.split("?")[0] ?? nextPath;
  if (barePath === "/get-started" || barePath.startsWith("/get-started/")) {
    url.searchParams.set("activation", "1");
  }
  return url;
}

function redirectSessionBootstrapToTenantHost(
  request: NextRequest,
  tenantSlug: string,
): NextResponse {
  const corrected = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    buildTenantSubdomainOrigin(tenantSlug),
  );
  return NextResponse.redirect(corrected);
}

function stampProductionPlaneCookies(response: NextResponse): void {
  response.cookies.set(SIMULATION_MODE_COOKIE, "0", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

function buildLoginFailureUrl(request: NextRequest, errorCode: string): URL {
  const loginUrl = new URL("/login", resolveBrowserFacingRequestOrigin(request));
  loginUrl.searchParams.set("error", errorCode);
  loginUrl.searchParams.set("fresh", "1");
  loginUrl.searchParams.set("next", "/get-started");
  return loginUrl;
}

function bootstrapUnauthorizedResponse(request: NextRequest, errorCode: string): NextResponse {
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ error: errorCode }, { status: 401 });
  }

  const requestHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    "";

  // Authenticated apex operators must not bounce through /login (middleware sends authed users to /integrity).
  if (isApexControlPlaneHost(requestHost)) {
    const tenantSlug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase();
    const origin = resolveBrowserFacingRequestOrigin(request);
    if (tenantSlug) {
      const launchUrl = new URL("/api/auth/workspace-launch", origin);
      launchUrl.searchParams.set("tenant", tenantSlug);
      launchUrl.searchParams.set("next", sanitizeAuthNextPath(request.nextUrl.searchParams.get("next"), "/"));
      return NextResponse.redirect(launchUrl);
    }
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", errorCode);
    loginUrl.searchParams.set("fresh", "1");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(buildLoginFailureUrl(request, errorCode));
}

/**
 * Establishes Supabase session cookies on the tenant workspace host via a single-use,
 * tenant-bound exchange token — never raw Supabase tokens in the query string.
 */
export async function GET(request: NextRequest) {
  const requestHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    "";
  const hostTenantSlug = tenantSlugFromHost(requestHost);

  const bootstrapToken = request.nextUrl.searchParams.get("token")?.trim();
  const legacyAccessToken = request.nextUrl.searchParams.get("access_token")?.trim();
  const legacyRefreshToken = request.nextUrl.searchParams.get("refresh_token")?.trim();
  const legacyTenantSlug = request.nextUrl.searchParams.get("tenant")?.trim().toLowerCase() || null;

  if (legacyTenantSlug && hostTenantSlug !== legacyTenantSlug) {
    return redirectSessionBootstrapToTenantHost(request, legacyTenantSlug);
  }

  if (legacyAccessToken || legacyRefreshToken) {
    return bootstrapUnauthorizedResponse(request, "legacy_bootstrap_retired");
  }

  const nextPath = sanitizeAuthNextPath(
    request.nextUrl.searchParams.get("next"),
    workspaceActivationNextParam(),
  );
  const destination = resolvePostActivationDestination(request, nextPath);

  if (!bootstrapToken) {
    return bootstrapUnauthorizedResponse(request, "missing_bootstrap_token");
  }

  if (!hostTenantSlug) {
    return bootstrapUnauthorizedResponse(request, "workspace_host_required");
  }

  const ticket = consumeWorkspaceBootstrapTicket(bootstrapToken, hostTenantSlug);
  if (!ticket) {
    return bootstrapUnauthorizedResponse(request, "bootstrap_token_invalid");
  }

  await ensureCorporateInviteRoleAssignment(ticket.userId, ticket.tenantSlug);

  const membershipAllowed = await assertWorkspaceBootstrapMembership(
    ticket.userId,
    ticket.tenantUuid,
    ticket.userEmail,
  );
  if (!membershipAllowed) {
    return NextResponse.json(
      {
        error:
          "Workspace access revoked or not assigned for this tenant. Sign in again or contact your administrator.",
      },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return bootstrapUnauthorizedResponse(request, "auth_not_configured");
  }

  const sessionTokens = await resolveBootstrapSessionTokens(ticket);
  if (!sessionTokens) {
    return bootstrapUnauthorizedResponse(request, "session_bootstrap_failed");
  }

  let response = NextResponse.redirect(destination);

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.redirect(destination);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        stampProductionPlaneCookies(response);
      },
    },
  });

  const { error } = await supabase.auth.setSession({
    access_token: sessionTokens.accessToken,
    refresh_token: sessionTokens.refreshToken,
  });

  if (error) {
    console.error("[api/auth/session-bootstrap] setSession", error.message);
    return bootstrapUnauthorizedResponse(request, "session_bootstrap_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id?.trim() || user.id.trim() !== ticket.userId) {
    return bootstrapUnauthorizedResponse(request, "session_identity_mismatch");
  }

  const inviteTenantSlug = readTenantSlugFromUserMetadata(user?.user_metadata ?? null);
  if (user?.id && inviteTenantSlug) {
    await ensureCorporateInviteRoleAssignment(user.id, inviteTenantSlug);
  }

  const cookieSlug = ticket.tenantSlug ?? inviteTenantSlug ?? hostTenantSlug;
  let cookieUuid: string | null = ticket.tenantUuid;
  if (!cookieUuid && cookieSlug) {
    cookieUuid = tenantUuidFromSlug(cookieSlug);
    if (!cookieUuid) {
      const tenant = await lookupTenantBySlug(cookieSlug);
      cookieUuid = tenant?.id ?? null;
    }
  }

  if (cookieUuid) {
    response.cookies.set(IRONFRAME_TENANT_COOKIE, cookieUuid, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TENANT_COOKIE_MAX_AGE,
    });
  }

  stampProductionPlaneCookies(response);

  return response;
}
