import { NextResponse } from "next/server";

import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { getFrameworkControlMappings } from "@/app/config/irontallyFrameworkControls";
import type { IrontallyFrameworkId } from "@/app/config/irontallyFrameworkControls";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

const FRAMEWORK_IDS: IrontallyFrameworkId[] = ["nist_csf", "iso_27001", "soc2_type2"];

function parseFramework(param: string | null): IrontallyFrameworkId | null {
  if (!param) return null;
  return FRAMEWORK_IDS.includes(param as IrontallyFrameworkId)
    ? (param as IrontallyFrameworkId)
    : null;
}

export async function GET(request: Request) {
  const tenantId = await getActiveTenantUuidFromCookies();
  const url = new URL(request.url);
  const framework = parseFramework(url.searchParams.get("framework"));
  const scoreParam = url.searchParams.get("score");
  const state = await readGovernanceMaturityState();
  const score =
    scoreParam != null && Number.isFinite(Number(scoreParam))
      ? Number(scoreParam)
      : state.current.score;

  const snapshot = buildIrontallyFrameworkSnapshot(score, state.current.calculatedAt);

  if (framework) {
    return NextResponse.json(
      {
        ok: true,
        tenantId,
        framework,
        mappings: getFrameworkControlMappings(framework),
        snapshot,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      tenantId,
      snapshot,
      frameworks: FRAMEWORK_IDS,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
