import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ingressSanitizerFailureResponse,
  sanitizeIngressPayload,
} from "@/app/lib/ironethic/ingressSanitizer";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import {
  IronbloomCriticalIngestionError,
  IronbloomIngestUnprocessableError,
  PhysicalUnitRequiredError,
  validateIronbloomEsgEntry,
} from "@/lib/sustainability/constants";
import {
  computeIronbloomCarbonTrace,
  InvalidIronbloomMetricError,
} from "@/lib/sustainability/ironbloom";

/**
 * Ironbloom (CSRD) intake — physical units mandatory (kWh, L, km).
 * Monetary-only payloads → INVALID_IRONBLOOM_METRIC_HOURS_OR_MONETARY_ONLY.
 */
export async function POST(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = sanitizeIngressPayload(await request.json());
  } catch (error) {
    const pepperFailure = ingressSanitizerFailureResponse(error);
    if (pepperFailure) {
      return NextResponse.json(pepperFailure.body, { status: pepperFailure.status });
    }
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const bodyTenantId =
      body != null && typeof body === "object" && "tenantId" in body
        ? String((body as { tenantId?: unknown }).tenantId ?? "").trim()
        : "";
    const resolvedTenantId = guard.userId ? guard.tenantUuid : bodyTenantId || guard.tenantUuid;
    const tenantKey = tenantKeyFromUuid(resolvedTenantId);

    const trace = computeIronbloomCarbonTrace({
      tenantId: resolvedTenantId,
      tenantKey,
      body,
    });

    validateIronbloomEsgEntry({
      assetId: trace.assetId,
      kwh: trace.physicalUnit === "kWh" ? trace.physicalQuantity : null,
      liters: trace.physicalUnit === "L" ? trace.physicalQuantity : null,
      km: trace.physicalUnit === "km" ? trace.physicalQuantity : null,
      payload: body,
    });

    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        tenantId: trace.tenantId,
        carbonTrace: {
          physicalUnit: trace.physicalUnit,
          physicalQuantity: trace.physicalQuantity,
          carbonGramsCo2e: trace.carbonGramsCo2e.toString(),
          serializedTrace: trace.serializedTrace,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof InvalidIronbloomMetricError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    if (e instanceof PhysicalUnitRequiredError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    if (e instanceof IronbloomCriticalIngestionError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    if (e instanceof IronbloomIngestUnprocessableError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
