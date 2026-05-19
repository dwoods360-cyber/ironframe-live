import { NextResponse } from "next/server";
import {
  assertEsgPhysicalIngestion,
  IronbloomCriticalIngestionError,
  IronbloomIngestUnprocessableError,
  PhysicalUnitRequiredError,
  validateIronbloomEsgEntry,
  validateIronbloomSustainabilityPayload,
} from "@/lib/sustainability/constants";

/**
 * Ironbloom (CSRD) intake — physical units mandatory; monetary-only → 400 PHYSICAL_UNIT_REQUIRED.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    assertEsgPhysicalIngestion(body);
  } catch (e) {
    if (e instanceof PhysicalUnitRequiredError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    throw e;
  }

  const assetId =
    body != null && typeof body === "object" && "assetId" in body
      ? String((body as { assetId?: unknown }).assetId ?? "ESG_INGEST")
      : "ESG_INGEST";

  try {
    if (body != null && typeof body === "object") {
      const o = body as Record<string, unknown>;
      validateIronbloomEsgEntry({
        assetId,
        kwh: o.kwh != null ? Number(o.kwh) : o.units_kwh != null ? Number(o.units_kwh) : null,
        liters: o.liters != null ? Number(o.liters) : null,
        km: o.km != null ? Number(o.km) : null,
        mitigatedValueCents:
          o.mitigatedValueCents != null || o.monetaryValue != null
            ? String(o.mitigatedValueCents ?? o.monetaryValue)
            : null,
        payload: body,
      });
    }
    validateIronbloomSustainabilityPayload(body, assetId);
  } catch (e) {
    if (e instanceof IronbloomCriticalIngestionError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
    }
    if (e instanceof IronbloomIngestUnprocessableError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, accepted: true }, { status: 200 });
}
