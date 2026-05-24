import { NextResponse } from "next/server";

import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { getFrameworkControlMappings } from "@/app/config/irontallyFrameworkControls";
import type { IrontallyFrameworkId } from "@/app/config/irontallyFrameworkControls";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import { compileFrameworkReadiness } from "@/src/services/compliance/irontallyEngine";
import {
  getScopedTenantUuidFromCookies,
  isValidTenantUuid,
  resolveTenantUuidForThreatScope,
} from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

const FRAMEWORK_IDS: IrontallyFrameworkId[] = ["nist_csf", "iso_27001", "soc2_type2"];

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function parseFramework(param: string | null): IrontallyFrameworkId | null {
  if (!param) return null;
  return FRAMEWORK_IDS.includes(param as IrontallyFrameworkId)
    ? (param as IrontallyFrameworkId)
    : null;
}

/** JSON-safe response body (BigInt → string, Date → ISO). */
function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v instanceof Date) return v.toISOString();
      return v;
    }),
  ) as T;
}

/**
 * Auditor readiness requires an explicit tenant boundary — cookie scope or validated `tenantId` query.
 */
async function resolveReadinessTenantId(request: Request): Promise<string | null> {
  const scoped = await getScopedTenantUuidFromCookies();
  if (scoped) return scoped;

  const param = new URL(request.url).searchParams.get("tenantId")?.trim();
  if (!param) return null;
  if (!isValidTenantUuid(param)) return null;

  return resolveTenantUuidForThreatScope(param);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const framework = parseFramework(url.searchParams.get("framework"));
    const scoreParam = url.searchParams.get("score");
    const readinessRequested = url.searchParams.get("readiness") === "1";

    const state = await readGovernanceMaturityState();
    const score =
      scoreParam != null && Number.isFinite(Number(scoreParam))
        ? Number(scoreParam)
        : state.current.score;

    const snapshot = buildIrontallyFrameworkSnapshot(score, state.current.calculatedAt);

    if (readinessRequested) {
      const tenantId = await resolveReadinessTenantId(request);
      if (!tenantId) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No active tenant. Select a tenant in Command Center or pass a valid `tenantId` UUID query parameter.",
          },
          { status: 401, headers: NO_STORE_HEADERS },
        );
      }

      try {
        const readiness = await compileFrameworkReadiness(tenantId);
        return NextResponse.json(
          toJsonSafe({ ok: true, tenantId, readiness, snapshot }),
          { headers: NO_STORE_HEADERS },
        );
      } catch (compileError: unknown) {
        const message =
          compileError instanceof Error ? compileError.message : "Framework readiness compilation failed.";
        console.error("[irontally/readiness] compileFrameworkReadiness failed:", compileError);
        return NextResponse.json(
          {
            ok: false,
            error: "IRONTALLY_READINESS_COMPILE_FAILED",
            message,
            tenantId,
            snapshot,
          },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    }

    const tenantId = await getScopedTenantUuidFromCookies();

    if (framework) {
      return NextResponse.json(
        toJsonSafe({
          ok: true,
          tenantId,
          framework,
          mappings: getFrameworkControlMappings(framework),
          snapshot,
        }),
        { headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      toJsonSafe({
        ok: true,
        tenantId,
        snapshot,
        frameworks: FRAMEWORK_IDS,
      }),
      { headers: NO_STORE_HEADERS },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Irontally route handler failed.";
    console.error("[irontally] GET failed:", error);
    return NextResponse.json(
      { ok: false, error: "IRONTALLY_ROUTE_ERROR", message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
