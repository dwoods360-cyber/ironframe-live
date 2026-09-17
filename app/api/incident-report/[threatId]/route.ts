import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { irongateInterceptRestrictedEvidenceChapterAccess } from "@/app/actions/agentActions";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { USER_CLEARANCE_COOKIE_NAME } from "@/app/utils/clearanceLogic";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseStoredPath(
  stored: string,
): { kind: "supabase"; bucket: string; objectPath: string } | { kind: "local"; relative: string } {
  if (stored.startsWith("supabase://")) {
    const rest = stored.slice("supabase://".length);
    const i = rest.indexOf("/");
    return { kind: "supabase", bucket: rest.slice(0, i), objectPath: rest.slice(i + 1) };
  }
  return { kind: "local", relative: stored };
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ threatId: string }> }) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;

  const { threatId } = await ctx.params;
  const cookieStore = await cookies();
  const userClearance = cookieStore.get(USER_CLEARANCE_COOKIE_NAME)?.value ?? "PUBLIC";
  const gate = await irongateInterceptRestrictedEvidenceChapterAccess({
    riskEventId: threatId,
    userClearance,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.httpStatus });
  }

  const lookup = await withIronguardTenant(guard.tenantUuid, async (tx) => {
    const primary = await tx.company.findFirst({
      where: { tenantId: guard.tenantUuid, isTestRecord: false },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    const company =
      primary ??
      (await tx.company.findFirst({
        where: { tenantId: guard.tenantUuid },
        orderBy: { id: "asc" },
        select: { id: true },
      }));
    if (!company) return { company: false as const, row: null };
    const row = await tx.riskEvent.findFirst({
      where: { id: threatId, tenantCompanyId: company.id },
      select: { postMortemReportPath: true },
    });
    return { company: true as const, row };
  });
  if (!lookup.company) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!lookup.row?.postMortemReportPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const reportPath = lookup.row.postMortemReportPath;

  const parsed = parseStoredPath(reportPath);
  let buf: Buffer;

  if (parsed.kind === "local") {
    const abs = path.join(process.cwd(), parsed.relative);
    buf = await readFile(abs);
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.objectPath);
    if (error || !data) {
      return NextResponse.json({ error: "Storage read failed" }, { status: 500 });
    }
    buf = Buffer.from(await data.arrayBuffer());
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ironframe-post-mortem-${threatId.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
