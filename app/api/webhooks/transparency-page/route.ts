import { NextResponse } from "next/server";
import {
  pushTransparencyBundleToCms,
  readTransparencyPublicBundleSync,
} from "@/app/lib/transparencyPublicDispatch";

export const dynamic = "force-dynamic";

/**
 * Secure ingress for Ironcast (Agent 7) or ops: peek latest public bundle and/or replay CMS push.
 * Authorization: Bearer ${TRANSPARENCY_WEBHOOK_INGRESS_SECRET}
 */
export async function POST(req: Request) {
  const secret = process.env.TRANSPARENCY_WEBHOOK_INGRESS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "TRANSPARENCY_WEBHOOK_INGRESS_SECRET is not configured." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization")?.trim();
  const headerSecret = req.headers.get("x-transparency-ingress-secret")?.trim();
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let op: "peek" | "push" = "peek";
  try {
    const json = await req.json().catch(() => null);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const o = (json as { op?: unknown }).op;
      if (o === "push") op = "push";
    }
  } catch {
    /* body optional */
  }

  const bundle = readTransparencyPublicBundleSync();
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "No public transparency bundle on disk." }, { status: 404 });
  }

  if (op === "peek") {
    return NextResponse.json({
      ok: true,
      op: "peek",
      disclosure: bundle.disclosure,
      pdfLink: bundle.pdfDownloadUrl,
      truthBadgeUrl: bundle.truthBadgeUrl,
      carbonResilienceBadgeUrl: bundle.carbonResilienceBadgeUrl,
      cmsWebhookLastAttempt: bundle.cmsWebhookLastAttempt ?? null,
    });
  }

  const push = await pushTransparencyBundleToCms(bundle);
  return NextResponse.json({
    ok: push.ok,
    op: "push",
    skipped: push.skipped,
    httpStatus: push.httpStatus,
    error: push.error,
  });
}
