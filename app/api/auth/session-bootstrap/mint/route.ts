import { NextResponse, type NextRequest } from "next/server";

import {
  mintWorkspaceBootstrapFromRequest,
  normalizeWorkspaceLaunchNextPath,
  normalizeWorkspaceLaunchSlug,
  stampSupabaseCookieMutations,
} from "@/app/lib/auth/mintWorkspaceBootstrapHandoff.server";

type MintBody = {
  tenantSlug?: string;
  nextPath?: string;
};

export async function POST(request: NextRequest) {
  let body: MintBody;
  try {
    body = (await request.json()) as MintBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const tenantSlug = normalizeWorkspaceLaunchSlug(body.tenantSlug);
  if (!tenantSlug) {
    return NextResponse.json({ error: "invalid_tenant_slug" }, { status: 400 });
  }

  const nextPath = normalizeWorkspaceLaunchNextPath(body.nextPath);
  const minted = await mintWorkspaceBootstrapFromRequest(request, tenantSlug, nextPath);

  if (!minted.ok) {
    const status =
      minted.reason === "unauthenticated"
        ? 401
        : minted.reason === "auth_not_configured"
          ? 503
          : minted.reason === "invalid_bootstrap_target"
            ? 500
            : 403;
    return NextResponse.json({ error: minted.reason }, { status });
  }

  const response = NextResponse.json({
    bootstrapUrl: minted.bootstrapUrl,
    redirectUrl: minted.bootstrapUrl,
  });
  return stampSupabaseCookieMutations(response, minted.cookieMutations);
}
