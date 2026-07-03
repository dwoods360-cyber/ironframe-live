import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { irongateInterceptRestrictedEvidenceChapterAccess } from "@/app/actions/agentActions";
import { getCompanyIdForTenantUuid } from "@/app/lib/grc/clearanceThreatResolve";
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
  const companyId = await getCompanyIdForTenantUuid(guard.tenantUuid);
  if (companyId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const userClearance = cookieStore.get(USER_CLEARANCE_COOKIE_NAME)?.value ?? "PUBLIC";
  const gate = await irongateInterceptRestrictedEvidenceChapterAccess({
    riskEventId: threatId,
    userClearance,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.message }, { status: gate.httpStatus });
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: { postMortemReportPath: true },
  });
  if (!row?.postMortemReportPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = parseStoredPath(row.postMortemReportPath);
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
