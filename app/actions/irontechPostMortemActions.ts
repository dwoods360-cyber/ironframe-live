"use server";

import { readFileSync, existsSync } from "fs";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  generateIrontechPostMortemReport,
  readLatestIrontechPostMortemForTenant,
  getPostMortemPdfStoragePath,
  type IrontechPostMortemReport,
} from "@/app/services/irontechPostMortem";

export type IrontechPostMortemDto = IrontechPostMortemReport;

export async function getLatestIrontechPostMortemAction(): Promise<IrontechPostMortemDto | null> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return null;
  return readLatestIrontechPostMortemForTenant(tenantId);
}

export async function regenerateIrontechPostMortemAction(): Promise<
  { ok: true; report: IrontechPostMortemDto } | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };
  const report = await generateIrontechPostMortemReport({ tenantId });
  return { ok: true, report };
}

export async function downloadIrontechPostMortemPdfAction(): Promise<
  | { ok: true; base64Pdf: string; filename: string; reportSha256: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };

  let report = readLatestIrontechPostMortemForTenant(tenantId);
  if (!report) {
    report = await generateIrontechPostMortemReport({ tenantId });
  }

  const pdfPath = getPostMortemPdfStoragePath(tenantId, report.reportId);
  if (!existsSync(pdfPath)) {
    const { buildIrontechPostMortemPdfBytes } = await import("@/app/utils/irontechPostMortemPdf");
    const { writeFileSync, mkdirSync } = await import("fs");
    const dir = pdfPath.replace(/[/\\][^/\\]+$/, "");
    mkdirSync(dir, { recursive: true });
    writeFileSync(pdfPath, Buffer.from(buildIrontechPostMortemPdfBytes(report)));
  }

  const bytes = readFileSync(pdfPath);
  return {
    ok: true,
    base64Pdf: bytes.toString("base64"),
    filename: `irontech-post-mortem-${report.reportId}.pdf`,
    reportSha256: report.reportSha256,
  };
}
