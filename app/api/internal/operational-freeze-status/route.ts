import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
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
 * Combined operational mutation freeze: sustainability stale lockdown **or** Ironguard circuit-breaker freeze.
 */
export async function GET(req: NextRequest) {
  if (!gatesAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const [snap, cfg] = await Promise.all([
    getIrontechFreezeEngineSnapshot(),
    prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { stateFreezeActive: true },
    }),
  ]);
  const globalStateFreeze = cfg?.stateFreezeActive === true;
  const staleLockdown = snap.isSystemFrozen;
  return NextResponse.json(
    {
      ok: true,
      lockdown: staleLockdown || globalStateFreeze,
      staleLockdown,
      globalStateFreeze,
      isSystemFrozen: snap.isSystemFrozen,
      staleDataLockdownWindow: snap.staleDataLockdownWindow,
      hoursDegraded: snap.hoursDegraded,
      degradedSinceIso: snap.degradedSinceIso,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
