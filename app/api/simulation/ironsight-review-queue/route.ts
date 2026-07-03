export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { listPendingThreatResolutionsCore } from "@/app/lib/server/ironsightReviewQueueCore";
import {
  isSimulationRequestAbortError,
  throwIfAborted,
} from "@/app/lib/server/simulationRequestAbort";
import { logServerRequestAbort } from "@/app/lib/server/logServerRequestAbort";

/** Agent 08 (Ironsight) — abortable HITL review queue; read-only threat approval rows. */
export async function GET(request: NextRequest) {
  noStore();
  const signal = request.signal;
  if (signal.aborted) {
    logServerRequestAbort({
      reason: "client-disconnect",
      path: request.nextUrl.pathname,
      method: request.method,
      surface: "api/simulation/ironsight-review-queue",
    });
    return NextResponse.json({ ok: false, error: "", items: [], aborted: true }, { status: 499 });
  }

  try {
    throwIfAborted(signal);
    const tenant = request.nextUrl.searchParams.get("tenant");
    const result = await listPendingThreatResolutionsCore(tenant, signal);
    throwIfAborted(signal);
    return NextResponse.json(result);
  } catch (error) {
    if (isSimulationRequestAbortError(error) || signal.aborted) {
      logServerRequestAbort({
        reason: error instanceof Error ? error.message : "simulation-request-aborted",
        path: request.nextUrl.pathname,
        method: request.method,
        surface: "api/simulation/ironsight-review-queue",
      });
      return NextResponse.json({ ok: false, error: "", items: [], aborted: true }, { status: 499 });
    }
    const message = error instanceof Error ? error.message : "Review queue unavailable.";
    return NextResponse.json({ ok: false, error: message, items: [] }, { status: 500 });
  }
}
