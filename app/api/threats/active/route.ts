import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { mapActiveThreatFromDbToPipelineThreat } from "@/app/utils/mapActiveThreatFromDbToPipelineThreat";
import {
  findActiveThreatEventRowsForBoard,
  mapThreatEventRowsToPipelineThreatFromDb,
} from "@/app/utils/activeThreatsBoardQuery";
import { isClientDisconnectError } from "@/app/utils/isClientDisconnectError";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  noStore();
  if (request.signal.aborted) {
    return new NextResponse(null, { status: 499 });
  }
  try {
    const rows = await findActiveThreatEventRowsForBoard();
    /** CONFIRMED/MITIGATED; in simulation/shadow read scope, also `IDENTIFIED` rows with Chaos JSON (`ingestionDetails.incident_type` CHAOS, `isChaosTest`, INFRASTRUCTURE drift). Tenant from cookies (`getActiveTenantUuidFromCookies`). */
    console.log("FETCHED THREATS COUNT:", rows.length);
    const fromDb = mapThreatEventRowsToPipelineThreatFromDb(rows);
    const formatted = fromDb.map(mapActiveThreatFromDbToPipelineThreat);
    return NextResponse.json(formatted, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    if (isClientDisconnectError(e) || request.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    console.error("[api/threats/active]", e);
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
