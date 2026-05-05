import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { ThreatState } from "@prisma/client";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { loadIncidentReportPayload } from "@/app/utils/incidentReportData";
import { buildDueDiligencePdfBytes } from "@/app/utils/generateDueDiligenceReport";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JUSTIFY_ALLOWED: ThreatState[] = [
  ThreatState.MITIGATED,
  ThreatState.RESOLVED,
  ThreatState.CLOSED_ARCHIVED,
];

/**
 * GET budget-optimized due diligence PDF (includes Executive Budget Justification appendix).
 * Requires session tenant scope; risk event must be MITIGATED, RESOLVED, or CLOSED_ARCHIVED.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  noStore();
  const { id: riskEventId } = await ctx.params;
  const tid = riskEventId?.trim();
  if (!tid) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { id: true, status: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!JUSTIFY_ALLOWED.includes(row.status)) {
    return NextResponse.json(
      { error: "Budget justification is available for validated or closed risk events only." },
      { status: 403 },
    );
  }

  const payload = await loadIncidentReportPayload(tid);
  if (!payload) {
    return NextResponse.json({ error: "Could not load case payload" }, { status: 500 });
  }

  const bytes = buildDueDiligencePdfBytes(payload);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ironframe-budget-justification-${tid.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
