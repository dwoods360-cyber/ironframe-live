import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";
import { getLatestUtilityRateForTenant } from "@/app/services/ironbloom/rateEngine";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";
import { encodeIronqueryAnalystCsv, type IronqueryAnalystCsvRow } from "@/app/utils/ironquery/csvEncoder";
import { buildIronqueryAnalystPdf } from "@/app/utils/ironquery/pdfReportEncoder";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ANALYST_BASELINE_CENTS: Record<"medshield" | "vaultbank" | "gridcore", bigint> = {
  medshield: 1110000000n,
  vaultbank: 590000000n,
  gridcore: 470000000n,
};

function toJsonPayload(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, raw) => (typeof raw === "bigint" ? raw.toString() : raw)),
  );
}

type ExportRequestBody = {
  tenantId?: string;
  format?: string;
};

async function readExportParams(request: NextRequest): Promise<{ tenantId: string; format: string }> {
  let bodyTenantId: string | undefined;
  let bodyFormat: string | undefined;
  if (request.method === "POST") {
    let body: ExportRequestBody;
    try {
      body = (await request.json()) as ExportRequestBody;
    } catch {
      throw new Error("IRONQUERY_EXPORT_BODY_INVALID");
    }
    bodyTenantId = body.tenantId?.trim();
    bodyFormat = body.format?.trim().toLowerCase();
  }
  const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim() || bodyTenantId;
  const format =
    request.nextUrl.searchParams.get("format")?.trim().toLowerCase() || bodyFormat || "csv";
  if (!tenantId) {
    throw new Error("IRONQUERY_EXPORT_TENANT_ID_REQUIRED");
  }
  return { tenantId, format };
}

function resolveScopedTenant(tenantId: string, request: NextRequest): { tenantId: string; tenantKey: TenantKey } {
  if (!UUID_RE.test(tenantId)) {
    throw new Error("IRONQUERY_EXPORT_TENANT_ID_INVALID");
  }

  const headerTenantId = request.headers.get("x-tenant-id")?.trim();
  if (headerTenantId && headerTenantId !== tenantId) {
    throw new Error("IRONQUERY_EXPORT_TENANT_MISMATCH");
  }

  const tenantKey = tenantKeyFromUuid(tenantId);
  if (!tenantKey) {
    throw new Error("IRONQUERY_EXPORT_TENANT_UNKNOWN");
  }

  return { tenantId, tenantKey };
}

function resolveAleBaseline(tenantKey: TenantKey): bigint {
  if (!(tenantKey in ANALYST_BASELINE_CENTS)) {
    throw new Error("IRONQUERY_EXPORT_BASELINE_UNAVAILABLE");
  }
  return ANALYST_BASELINE_CENTS[tenantKey as keyof typeof ANALYST_BASELINE_CENTS];
}

async function handleExport(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED_CRON_CONTEXT" }, { status: 401 });
  }

  try {
    const { tenantId, format } = await readExportParams(request);
    const { tenantKey } = resolveScopedTenant(tenantId, request);
    const aleBaselineCents = resolveAleBaseline(tenantKey);
    const quote = await getLatestUtilityRateForTenant(tenantKey);
    if (quote.unitType !== "kWh") {
      throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
    }

    const generatedAt = new Date().toISOString();
    const analystRow: IronqueryAnalystCsvRow = {
      tenantId,
      tenantKey,
      aleBaselineCents,
      rateUsdPerUnit: quote.rateUsdPerUnit,
      unitType: "kWh",
      source: quote.source,
      jurisdiction: quote.jurisdiction,
      polledAt: quote.polledAt,
      generatedAt,
    };

    if (format === "csv") {
      const csv = encodeIronqueryAnalystCsv([analystRow]);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename=\"ironquery-analyst-export-${tenantKey}.csv\"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfBytes = await buildIronqueryAnalystPdf([analystRow]);
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename=\"ironquery-analyst-export-${tenantKey}.pdf\"`,
        },
      });
    }

    return NextResponse.json(
      toJsonPayload({
        ok: true,
        tenantId,
        tenantKey,
        aleBaselineCents,
        utilityQuote: quote,
        generatedAt,
      }),
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  return handleExport(request);
}

export async function POST(request: NextRequest) {
  return handleExport(request);
}
