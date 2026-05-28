import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/app/api/internal/cron/cronAuth";
import { getLatestUtilityRateForTenant } from "@/app/services/ironbloom/rateEngine";
import { tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";

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

function resolveScopedTenant(request: NextRequest): { tenantId: string; tenantKey: TenantKey } {
  const tenantId = request.nextUrl.searchParams.get("tenantId")?.trim();
  if (!tenantId) {
    throw new Error("IRONQUERY_EXPORT_TENANT_ID_REQUIRED");
  }
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
    const { tenantId, tenantKey } = resolveScopedTenant(request);
    const aleBaselineCents = resolveAleBaseline(tenantKey);
    const quote = await getLatestUtilityRateForTenant(tenantKey);
    if (quote.unitType !== "kWh") {
      throw new Error("IRONQUERY_EXPORT_NON_PHYSICAL_UNIT");
    }

    return NextResponse.json(
      toJsonPayload({
        ok: true,
        tenantId,
        tenantKey,
        aleBaselineCents,
        utilityQuote: quote,
        generatedAt: new Date().toISOString(),
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
