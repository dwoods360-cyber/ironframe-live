import { NextRequest, NextResponse } from "next/server";

import { lookupTenantBySlug } from "@/app/lib/tenantSlugRegistry";
import { normalizeTenantSlugInput } from "@/app/lib/tenantSubdomain";

export const dynamic = "force-dynamic";

function gatesAuthorized(req: NextRequest): boolean {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-ironframe-internal-gates") === secret;
}

/** Edge/middleware helper: resolve tenant UUID for a subdomain slug label. */
export async function GET(req: NextRequest) {
  if (!gatesAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const slug = normalizeTenantSlugInput(req.nextUrl.searchParams.get("slug") ?? "");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  const tenant = await lookupTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(
    { ok: true, tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
