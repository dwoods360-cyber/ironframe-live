import { NextRequest, NextResponse } from "next/server";

import { getIrontechFreezeEngineSnapshot } from "@/src/services/irontech/freezeEngine";

export const dynamic = "force-dynamic";

function gatesAuthorized(req: NextRequest): boolean {
  const secret =
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("x-ironframe-internal-gates") === secret;
}

/**
 * Edge/middleware helper: mutation freeze active (24h+ degraded, no waiver).
 * Secured with shared internal secret (same family as cron).
 */
export async function GET(req: NextRequest) {
  if (!gatesAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const snap = await getIrontechFreezeEngineSnapshot();
  return NextResponse.json(
    {
      ok: true,
      lockdown: snap.isSystemFrozen,
      isSystemFrozen: snap.isSystemFrozen,
      staleDataLockdownWindow: snap.staleDataLockdownWindow,
      hoursDegraded: snap.hoursDegraded,
      degradedSinceIso: snap.degradedSinceIso,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
