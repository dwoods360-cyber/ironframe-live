import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { resolveThreatAction } from "@/app/actions/threatActions";
import { validateJustification } from "@/src/services/ironlock/validationRules";

export const dynamic = "force-dynamic";

/**
 * Chaos provisions ingress — human “correction artifact” closure (same forensic gates as
 * `POST /api/threats/[id]/neutralize`, BigInt-safe ledger via Prisma).
 */
export async function POST(req: NextRequest) {
  noStore();
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const threatId =
    typeof b.threatId === "string"
      ? b.threatId.trim()
      : typeof b.id === "string"
        ? b.id.trim()
        : "";
  if (!threatId) {
    return NextResponse.json({ ok: false, error: "Missing threatId" }, { status: 400 });
  }

  const justification =
    typeof b.justification === "string"
      ? b.justification
      : typeof b.resolutionJustification === "string"
        ? b.resolutionJustification
        : typeof b.correctionArtifactNarrative === "string"
          ? b.correctionArtifactNarrative
          : "";
  const v = validateJustification(justification);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: v.httpStatus });
  }

  const operatorId =
    typeof b.operatorId === "string" && b.operatorId.trim()
      ? b.operatorId.trim()
      : "chaos-provisions-correction-artifact";
  const actorDisplayName =
    typeof b.actorDisplayName === "string" ? b.actorDisplayName : undefined;

  try {
    const result = await resolveThreatAction(threatId, operatorId, justification, actorDisplayName);
    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: "Resolution rejected or validation failed." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        ok: true,
        financialRisk_cents: result.financialRisk_cents,
        constitutionalHash: result.constitutionalHash,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Ironframe-Client-Refresh": "1",
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resolution blocked.";
    const constitutional = /CONSTITUTIONAL EMERGENCY|RE-BASELINE_VERIFICATION/i.test(msg);
    return NextResponse.json({ ok: false, error: msg }, { status: constitutional ? 503 : 500 });
  }
}
