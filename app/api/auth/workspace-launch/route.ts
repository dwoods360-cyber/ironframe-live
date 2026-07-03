import { NextResponse, type NextRequest } from "next/server";

import {
  mintWorkspaceBootstrapFromRequest,
  normalizeWorkspaceLaunchNextPath,
  normalizeWorkspaceLaunchSlug,
  stampSupabaseCookieMutations,
} from "@/app/lib/auth/mintWorkspaceBootstrapHandoff.server";
import { buildTenantLoginRedirectUrl } from "@/app/lib/tenantSubdomain";

export const dynamic = "force-dynamic";

function tenantLoginRedirect(tenantSlug: string, nextPath: string, fresh = false): NextResponse {
  const loginUrl = new URL(buildTenantLoginRedirectUrl(tenantSlug));
  loginUrl.searchParams.set("next", nextPath);
  if (fresh) loginUrl.searchParams.set("fresh", "1");
  return NextResponse.redirect(loginUrl);
}

async function launchWorkspace(
  request: NextRequest,
  tenantSlug: string | null,
  nextPath: string,
): Promise<NextResponse> {
  if (!tenantSlug) {
    return NextResponse.json({ error: "invalid_tenant_slug" }, { status: 400 });
  }

  const minted = await mintWorkspaceBootstrapFromRequest(request, tenantSlug, nextPath);

  if (!minted.ok) {
    // Never bounce through apex /login — middleware sends authed apex users to /integrity.
    return tenantLoginRedirect(
      tenantSlug,
      nextPath,
      minted.reason === "unauthenticated",
    );
  }

  const response = NextResponse.redirect(minted.bootstrapUrl);
  return stampSupabaseCookieMutations(response, minted.cookieMutations);
}

/**
 * Apex Command Post launcher — mint bootstrap ticket and 302 to tenant workspace in one hop.
 */
export async function GET(request: NextRequest) {
  const tenantSlug = normalizeWorkspaceLaunchSlug(
    request.nextUrl.searchParams.get("tenant") ??
      request.nextUrl.searchParams.get("tenantSlug"),
  );
  const nextPath = normalizeWorkspaceLaunchNextPath(request.nextUrl.searchParams.get("next"));
  return launchWorkspace(request, tenantSlug, nextPath);
}

export async function POST(request: NextRequest) {
  let tenantSlug: string | null = null;
  let nextPath = "/";

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { tenant?: string; tenantSlug?: string; next?: string };
      tenantSlug = normalizeWorkspaceLaunchSlug(body.tenant ?? body.tenantSlug);
      nextPath = normalizeWorkspaceLaunchNextPath(body.next);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  } else {
    const formData = await request.formData();
    tenantSlug = normalizeWorkspaceLaunchSlug(
      formData.get("tenant")?.toString() ?? formData.get("tenantSlug")?.toString(),
    );
    nextPath = normalizeWorkspaceLaunchNextPath(formData.get("next")?.toString());
  }

  return launchWorkspace(request, tenantSlug, nextPath);
}
