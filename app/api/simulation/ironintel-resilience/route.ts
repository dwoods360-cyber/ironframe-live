export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { pollResilienceIntelStreamLinesCore } from "@/app/lib/server/ironintelResiliencePollCore";
import {
  isSimulationRequestAbortError,
  throwIfAborted,
} from "@/app/lib/server/simulationRequestAbort";

/** Agent 11 (Ironintel) — abortable resilience intel poll; audit log read path only. */
export async function GET(request: NextRequest) {
  noStore();
  const signal = request.signal;
  if (signal.aborted) {
    return NextResponse.json({ rows: [], aborted: true }, { status: 499 });
  }

  try {
    throwIfAborted(signal);
    const after = request.nextUrl.searchParams.get("after");
    const showSimulation = request.nextUrl.searchParams.get("simulation") === "1";
    const rows = await pollResilienceIntelStreamLinesCore(after, { showSimulation }, signal);
    throwIfAborted(signal);
    return NextResponse.json({ rows });
  } catch (error) {
    if (isSimulationRequestAbortError(error) || signal.aborted) {
      return NextResponse.json({ rows: [], aborted: true }, { status: 499 });
    }
    const message = error instanceof Error ? error.message : "Resilience poll unavailable.";
    return NextResponse.json({ rows: [], error: message }, { status: 500 });
  }
}
