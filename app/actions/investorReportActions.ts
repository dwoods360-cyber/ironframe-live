"use server";

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { headers } from "next/headers";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { signInvestorReportDownloadToken } from "@/app/lib/investorReportShareToken";

type LatestJson = { relativePath?: string };

export async function createInvestorReportShareLink(): Promise<
  { ok: true; url: string; expiresInHours: number } | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return { ok: false, error: "No active tenant." };
  }

  const latestPath = join(process.cwd(), "storage", "investor-reports", "latest.json");
  if (!existsSync(latestPath)) {
    return { ok: false, error: "No investor report generated yet." };
  }

  let relPath: string;
  try {
    const j = JSON.parse(readFileSync(latestPath, "utf8")) as LatestJson;
    if (typeof j.relativePath !== "string" || !j.relativePath.startsWith("worm/")) {
      return { ok: false, error: "Report path invalid." };
    }
    relPath = j.relativePath;
  } catch {
    return { ok: false, error: "Could not read report manifest." };
  }

  try {
    const token = signInvestorReportDownloadToken(relPath);
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    const base = `${proto}://${host}`;
    const url = `${base}/api/grc/investor-reports/download?t=${encodeURIComponent(token)}`;
    return { ok: true, url, expiresInHours: 72 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not sign link." };
  }
}
