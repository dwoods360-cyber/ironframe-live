import { NextResponse } from "next/server";

import {
  listCrosswalkTargets,
  resolveFrameworkCrosswalk,
} from "@/app/lib/irontally/frameworkCrosswalk";
import {
  getFrameworkControlMappings,
  type IrontallyFrameworkId,
} from "@/app/config/irontallyFrameworkControls";

export const dynamic = "force-dynamic";

const FRAMEWORK_IDS = new Set<IrontallyFrameworkId>([
  "nist_csf",
  "iso_27001",
  "soc2_type2",
  "csrd_esrs",
  "eu_ai_act",
  "dora",
  "nydfs_500",
  "uk_csr",
]);

const NO_STORE = { "Cache-Control": "no-store" } as const;

function parseFramework(value: string | null): IrontallyFrameworkId | null {
  if (!value?.trim()) return null;
  const id = value.trim() as IrontallyFrameworkId;
  return FRAMEWORK_IDS.has(id) ? id : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = parseFramework(url.searchParams.get("source"));
  const target = parseFramework(url.searchParams.get("target"));
  const controlId = url.searchParams.get("controlId")?.trim() ?? "";

  if (!source) {
    return NextResponse.json(
      { error: "Query param `source` must be a supported framework id." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (controlId && target) {
    const edges = resolveFrameworkCrosswalk({
      sourceFramework: source,
      sourceControlId: controlId,
      targetFramework: target,
    });
    return NextResponse.json(
      {
        source,
        target,
        controlId,
        edges,
        ragReady: edges.length > 0,
      },
      { headers: NO_STORE },
    );
  }

  if (controlId) {
    const targets = listCrosswalkTargets(source, controlId);
    return NextResponse.json(
      { source, controlId, targets },
      { headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      source,
      controls: getFrameworkControlMappings(source),
    },
    { headers: NO_STORE },
  );
}
