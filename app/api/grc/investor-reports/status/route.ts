import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

type LatestManifest = {
  template?: string;
  generatedAt?: string;
  milestoneDays?: number;
  pdfSha256?: string;
  relativePath?: string;
  wormTargetGsUri?: string;
};

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 400 });
  }

  const latestPath = join(process.cwd(), "storage", "investor-reports", "latest.json");
  if (!existsSync(latestPath)) {
    return NextResponse.json({
      ok: true,
      ready: false,
      tenantId,
    });
  }

  try {
    const raw = JSON.parse(readFileSync(latestPath, "utf8")) as LatestManifest;
    return NextResponse.json({
      ok: true,
      ready: true,
      tenantId,
      template: raw.template ?? null,
      generatedAt: raw.generatedAt ?? null,
      milestoneDays: raw.milestoneDays ?? null,
      pdfSha256: raw.pdfSha256 ?? null,
      relativePath: raw.relativePath ?? null,
      wormTargetGsUri: raw.wormTargetGsUri ?? null,
    });
  } catch {
    return NextResponse.json({ ok: true, ready: false, tenantId });
  }
}
