export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { ThreatState } from "@prisma/client";
import { mapActiveThreatFromDbToPipelineThreat } from "@/app/utils/mapActiveThreatFromDbToPipelineThreat";
import {
  findActiveThreatEventRowsForBoard,
  mapThreatEventRowsToPipelineThreatFromDb,
} from "@/app/utils/activeThreatsBoardQuery";
import { isClientDisconnectError } from "@/app/utils/isClientDisconnectError";
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from "@/app/utils/serverTenantContext";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  getTasFingerprintSnapshot,
  resolveThreatStatusUnderConstitutionalLock,
  syncConstitutionalIntegrityEnforcement,
} from "@/app/utils/tasFingerprint";

/**
 * Active Risks API: no Next.js data cache; tenant = valid **`x-tenant-id`** header if present, else
 * **`ironframe-tenant`** cookie (see `getActiveTenantUuidFromCookies`), else **Medshield** UUID so the board
 * never “blacks out”. Prisma scope excludes **`RESOLVED` / `CLOSED_ARCHIVED`** via
 * {@link findActiveThreatEventRowsForBoard}.
 */
export async function GET(request: NextRequest) {
  noStore();
  if (request.signal.aborted) {
    return new NextResponse(null, { status: 499 });
  }
  try {
    const integritySnap = await syncConstitutionalIntegrityEnforcement();

    const headerTenant = request.headers.get("x-tenant-id")?.trim() ?? "";
    const cookieTenant = await getActiveTenantUuidFromCookies();
    const effectiveTenantUuid =
      headerTenant && isValidTenantUuid(headerTenant)
        ? headerTenant
        : cookieTenant || TENANT_UUIDS.medshield;
    const rows = await findActiveThreatEventRowsForBoard(effectiveTenantUuid);
    /** Defense-in-depth: Prisma already excludes terminal states; never surface RESOLVED on Active. */
    const visibleRows = rows.filter((r) => {
      const s = r.status as ThreatState;
      return s !== ThreatState.RESOLVED && s !== ThreatState.CLOSED_ARCHIVED;
    });
    const fromDb = mapThreatEventRowsToPipelineThreatFromDb(visibleRows);
    const threats = fromDb.map((row) => {
      const mapped = mapActiveThreatFromDbToPipelineThreat(row);
      return {
        ...mapped,
        threatStatus: resolveThreatStatusUnderConstitutionalLock(
          mapped.threatStatus ?? "IDENTIFIED",
          mapped.ingestionDetails ?? null,
          integritySnap,
        ),
      };
    });
    console.log("FETCHED THREATS COUNT:", threats.length);
    const snap = getTasFingerprintSnapshot();
    return NextResponse.json(threats, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Constitutional-Emergency": snap.isConstitutionalEmergency ? "1" : "0",
        "X-Constitutional-Rebaseline": snap.constitutionalRebaselinePending ? "1" : "0",
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
