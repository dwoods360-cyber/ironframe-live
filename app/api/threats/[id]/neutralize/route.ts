import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { resolveThreatAction } from "@/app/actions/threatActions";
import { validateJustification } from "@/src/services/ironlock/validationRules";

export const dynamic = "force-dynamic";

/**
 * POST neutralize — persists RESOLVED on the threat row (same rules as `resolveThreatAction` / GRC justification length).
 * After 200, clients should call `useRiskStore.getState().pulseThreatBoardsFromDb()` — it refetches
 * `/api/threats/active`, `/api/threats` pipeline slice, warms `/api/opsupport/deficiency-queue`, and emits `ironframe-operational-refresh`.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  noStore();
  const { id } = await ctx.params;
  const tid = id?.trim();
  if (!tid) {
    return NextResponse.json({ ok: false, error: "Missing threat id" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const justification =
    typeof b.justification === "string"
      ? b.justification
      : typeof b.resolutionJustification === "string"
        ? b.resolutionJustification
        : "";
  const v = validateJustification(justification);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: v.httpStatus });
  }
  const operatorId =
    typeof b.operatorId === "string" && b.operatorId.trim()
      ? b.operatorId.trim()
      : "neutralize-api";
  const actorDisplayName = typeof b.actorDisplayName === "string" ? b.actorDisplayName : undefined;

  let result: Awaited<ReturnType<typeof resolveThreatAction>>;
  try {
    result = await resolveThreatAction(tid, operatorId, justification, actorDisplayName);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resolution blocked.";
    const constitutional =
      /CONSTITUTIONAL EMERGENCY|RE-BASELINE_VERIFICATION/i.test(msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: constitutional ? 503 : 500 },
    );
  }
  if (!result.success) {
    const detail =
      "error" in result && typeof result.error === "string" && result.error.trim()
        ? result.error.trim()
        : "Neutralization rejected or validation failed.";
    return NextResponse.json({ ok: false, error: detail }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, financialRisk_cents: result.financialRisk_cents, constitutionalHash: result.constitutionalHash },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Ironframe-Client-Refresh": "1",
      },
    },
  );
}
