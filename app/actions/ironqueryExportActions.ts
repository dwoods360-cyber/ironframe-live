"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getLatestUtilityRateForTenant } from "@/app/services/ironbloom/rateEngine";
import { encodeIronqueryAnalystCsv, type IronqueryAnalystCsvRow } from "@/app/utils/ironquery/csvEncoder";
import { buildIronqueryAnalystPdf } from "@/app/utils/ironquery/pdfReportEncoder";
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from "@/app/utils/serverTenantContext";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";
import {
  archiveComplianceReport,
  type ArchiveClassification,
  type ArchiveFormat,
} from "@/src/services/ironquery/exportArchive";
import type { PdfExportDescriptor } from "@/src/services/ironquery/exportSigner";

const ANALYST_BASELINE_CENTS: Record<"medshield" | "vaultbank" | "gridcore", bigint> = {
  medshield: 1110000000n,
  vaultbank: 590000000n,
  gridcore: 470000000n,
};

export type IronqueryExportHistoryRow = {
  artifactId: string;
  filename: string;
  createdAt: string;
  sha256: string;
  status: "CONFIRMED";
  generatedByUserId: string;
  storagePath: string;
};

export type IronqueryExportDashboardContext =
  | { ok: true; tenantId: string; history: IronqueryExportHistoryRow[] }
  | { ok: false; error: string };

function filenameFromStoragePath(storagePath: string): string {
  const segment = storagePath.split("/").pop() ?? storagePath;
  return segment || "ironquery-export.sealed.json";
}

async function requireScopedTenantId(): Promise<
  { ok: true; tenantId: string; tenantKey: TenantKey } | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId || !isValidTenantUuid(tenantId)) {
    return {
      ok: false,
      error: "Select a tenant in Command Center (ironframe-tenant cookie) to access analyst exports.",
    };
  }
  const tenantKey = tenantKeyFromUuid(tenantId);
  if (!tenantKey) {
    return { ok: false, error: "Unknown tenant scope for analyst export." };
  }
  return { ok: true, tenantId, tenantKey };
}

function resolveAleBaseline(tenantKey: TenantKey): bigint {
  if (!(tenantKey in ANALYST_BASELINE_CENTS)) {
    throw new Error("IRONQUERY_EXPORT_BASELINE_UNAVAILABLE");
  }
  return ANALYST_BASELINE_CENTS[tenantKey as keyof typeof ANALYST_BASELINE_CENTS];
}

async function buildAnalystRow(tenantId: string, tenantKey: TenantKey): Promise<IronqueryAnalystCsvRow> {
  const aleBaselineCents = resolveAleBaseline(tenantKey);
  const quote = await getLatestUtilityRateForTenant(tenantKey);
  if (quote.unitType !== "kWh") {
    throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
  }
  return {
    tenantId,
    tenantKey,
    aleBaselineCents,
    rateUsdPerUnit: quote.rateUsdPerUnit,
    unitType: "kWh",
    source: quote.source,
    jurisdiction: quote.jurisdiction,
    polledAt: quote.polledAt,
    generatedAt: new Date().toISOString(),
  };
}

export async function getIronqueryExportDashboardContext(): Promise<IronqueryExportDashboardContext> {
  const scope = await requireScopedTenantId();
  if (!scope.ok) return scope;

  const rows = await prisma.evidenceArtifact.findMany({
    where: {
      tenantId: scope.tenantId,
      OR: [{ storagePath: { contains: "/financial/" } }, { storagePath: { contains: "/forensic/" } }],
      storagePath: { contains: "/ironquery/" },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      sha256: true,
      storagePath: true,
      createdAt: true,
      uploadedByUserId: true,
    },
  });

  return {
    ok: true,
    tenantId: scope.tenantId,
    history: rows.map((row) => ({
      artifactId: row.id,
      filename: filenameFromStoragePath(row.storagePath),
      createdAt: row.createdAt.toISOString(),
      sha256: row.sha256,
      status: "CONFIRMED",
      generatedByUserId: row.uploadedByUserId,
      storagePath: row.storagePath,
    })),
  };
}

export async function sealIronqueryComplianceExport(input: {
  format: ArchiveFormat;
  classification: ArchiveClassification;
}): Promise<
  | { ok: true; artifactId: string; canonicalSha256: string }
  | { ok: false; error: string }
> {
  try {
    const scope = await requireScopedTenantId();
    if (!scope.ok) return scope;

    const analystRow = await buildAnalystRow(scope.tenantId, scope.tenantKey);
    const payload: string | PdfExportDescriptor =
      input.format === "csv"
        ? encodeIronqueryAnalystCsv([analystRow])
        : (() => {
            const csv = encodeIronqueryAnalystCsv([analystRow]);
            const dataHash = createHash("sha256").update(csv).digest("hex");
            return {
              exportId: randomUUID(),
              dataSnapshotTimestamp: analystRow.generatedAt,
              contentSchemaVersion: 1,
              sections: [
                {
                  id: "analyst-pack",
                  title: `Ironquery Analyst — ${scope.tenantKey}`,
                  dataHash,
                  rowsCount: 1,
                },
              ],
            };
          })();

    const archived = await archiveComplianceReport({
      tenantId: scope.tenantId,
      generatedByUserId: "ANALYST_EXPORT_DASHBOARD",
      format: input.format,
      classification: input.classification,
      payload,
    });

    revalidatePath("/dashboard/exports");
    return { ok: true, artifactId: archived.artifactId, canonicalSha256: archived.canonicalSha256 };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function downloadIronqueryAnalystPack(
  format: "csv" | "pdf",
): Promise<
  | { ok: true; filename: string; contentType: string; base64: string }
  | { ok: false; error: string }
> {
  try {
    const scope = await requireScopedTenantId();
    if (!scope.ok) return scope;

    const analystRow = await buildAnalystRow(scope.tenantId, scope.tenantKey);
    if (format === "csv") {
      const csv = encodeIronqueryAnalystCsv([analystRow]);
      return {
        ok: true,
        filename: `ironquery-analyst-export-${scope.tenantKey}.csv`,
        contentType: "text/csv; charset=utf-8",
        base64: Buffer.from(csv, "utf8").toString("base64"),
      };
    }

    const pdfBytes = await buildIronqueryAnalystPdf([analystRow]);
    return {
      ok: true,
      filename: `ironquery-analyst-export-${scope.tenantKey}.pdf`,
      contentType: "application/pdf",
      base64: Buffer.from(pdfBytes).toString("base64"),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
