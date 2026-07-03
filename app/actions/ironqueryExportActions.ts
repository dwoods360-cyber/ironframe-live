"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { encodeIronqueryAnalystCsv, type IronqueryAnalystCsvRow } from "@/app/utils/ironquery/csvEncoder";
import { buildIronqueryAnalystPdf } from "@/app/utils/ironquery/pdfReportEncoder";
import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import {
  assertTenantBillingActive,
  TenantBillingHoldError,
} from "@/app/lib/billing/tenantBillingEntitlement";
import {
  resolveIronqueryExportScope,
  resolveUtilityRateForExportScope,
  type IronqueryExportScope,
} from "@/app/lib/ironquery/resolveIronqueryExportScope";
import { getActiveTenantUuidFromCookies, isValidTenantUuid } from "@/app/utils/serverTenantContext";
import {
  archiveComplianceReport,
  type ArchiveClassification,
  type ArchiveFormat,
} from "@/src/services/ironquery/exportArchive";
import type { PdfExportDescriptor } from "@/src/services/ironquery/exportSigner";

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
  | {
      ok: false;
      error: string;
      code?: "BILLING_HOLD" | "SCOPE_REQUIRED";
      tenantSlug?: string;
      billingStatus?: string;
    };

function filenameFromStoragePath(storagePath: string): string {
  const segment = storagePath.split("/").pop() ?? storagePath;
  return segment || "ironquery-export.sealed.json";
}

async function requireIronqueryExportScope(): Promise<
  | { ok: true; scope: IronqueryExportScope }
  | {
      ok: false;
      error: string;
      code: "SCOPE_REQUIRED";
    }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId || !isValidTenantUuid(tenantId)) {
    return {
      ok: false,
      code: "SCOPE_REQUIRED",
      error: "Select a tenant in Command Center (ironframe-tenant cookie) to access analyst exports.",
    };
  }

  const scope = await resolveIronqueryExportScope(tenantId);
  if (!scope) {
    return {
      ok: false,
      code: "SCOPE_REQUIRED",
      error:
        "Analyst export scope unavailable. Complete Get Started (ALE baseline) for this workspace, then retry.",
    };
  }

  return { ok: true, scope };
}

async function requireExportBillingEntitlement(
  tenantId: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; code: "BILLING_HOLD"; tenantSlug?: string; billingStatus: string }
> {
  try {
    const platformAdmin = await canUsePlatformAdminTools();
    await assertTenantBillingActive(tenantId, { platformAdminBypass: platformAdmin });
    return { ok: true };
  } catch (error) {
    if (error instanceof TenantBillingHoldError) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      });
      return {
        ok: false,
        code: "BILLING_HOLD",
        error: "Commercial entitlement required before analyst export.",
        tenantSlug: tenant?.slug,
        billingStatus: error.billingStatus,
      };
    }
    throw error;
  }
}

async function buildAnalystRow(scope: IronqueryExportScope): Promise<IronqueryAnalystCsvRow> {
  const quote = await resolveUtilityRateForExportScope(scope.exportKey);
  if (quote.unitType !== "kWh") {
    throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
  }
  return {
    tenantId: scope.tenantId,
    tenantKey: scope.exportKey,
    aleBaselineCents: scope.aleBaselineCents,
    rateUsdPerUnit: quote.rateUsdPerUnit,
    unitType: "kWh",
    source: quote.source,
    jurisdiction: quote.jurisdiction,
    polledAt: quote.polledAt,
    generatedAt: new Date().toISOString(),
  };
}

export async function getIronqueryExportDashboardContext(): Promise<IronqueryExportDashboardContext> {
  const scoped = await requireIronqueryExportScope();
  if (!scoped.ok) return scoped;

  const billing = await requireExportBillingEntitlement(scoped.scope.tenantId);
  if (!billing.ok) return billing;

  const rows = await prisma.evidenceArtifact.findMany({
    where: {
      tenantId: scoped.scope.tenantId,
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
    tenantId: scoped.scope.tenantId,
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
  | {
      ok: false;
      error: string;
      code?: "BILLING_HOLD" | "SCOPE_REQUIRED";
      tenantSlug?: string;
      billingStatus?: string;
    }
> {
  try {
    const scoped = await requireIronqueryExportScope();
    if (!scoped.ok) return scoped;

    const billing = await requireExportBillingEntitlement(scoped.scope.tenantId);
    if (!billing.ok) return billing;

    const analystRow = await buildAnalystRow(scoped.scope);
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
                  title: `Ironquery Analyst — ${scoped.scope.exportKey}`,
                  dataHash,
                  rowsCount: 1,
                },
              ],
            };
          })();

    const archived = await archiveComplianceReport({
      tenantId: scoped.scope.tenantId,
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
  | {
      ok: false;
      error: string;
      code?: "BILLING_HOLD" | "SCOPE_REQUIRED";
      tenantSlug?: string;
      billingStatus?: string;
    }
> {
  try {
    const scoped = await requireIronqueryExportScope();
    if (!scoped.ok) return scoped;

    const billing = await requireExportBillingEntitlement(scoped.scope.tenantId);
    if (!billing.ok) return billing;

    const analystRow = await buildAnalystRow(scoped.scope);
    if (format === "csv") {
      const csv = encodeIronqueryAnalystCsv([analystRow]);
      return {
        ok: true,
        filename: `ironquery-analyst-export-${scoped.scope.exportKey}.csv`,
        contentType: "text/csv; charset=utf-8",
        base64: Buffer.from(csv, "utf8").toString("base64"),
      };
    }

    const pdfBytes = await buildIronqueryAnalystPdf([analystRow]);
    return {
      ok: true,
      filename: `ironquery-analyst-export-${scoped.scope.exportKey}.pdf`,
      contentType: "application/pdf",
      base64: Buffer.from(pdfBytes).toString("base64"),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
