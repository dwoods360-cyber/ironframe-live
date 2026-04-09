import { NextResponse } from "next/server";
import { PhysicalUnit } from "@prisma/client";
import { processPhysicalEsgMetric } from "@/app/lib/agents/ironbloomAgent";

const MONETARY_KEYS = ["cost", "price", "spent", "usd", "budget"] as const;
const ALLOWED_UNITS = new Set<PhysicalUnit>(["KWH", "LITERS", "KILOMETERS"]);

function hasMonetaryContamination(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((item) => hasMonetaryContamination(item));
  if (typeof value !== "object") return false;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.trim().toLowerCase();
    if (MONETARY_KEYS.some((m) => normalized === m || normalized.includes(m))) {
      return true;
    }
    if (hasMonetaryContamination(nested)) {
      return true;
    }
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // 1) Irongate Rejection Protocol: monetary contamination is forbidden.
    if (hasMonetaryContamination(body)) {
      return NextResponse.json(
        {
          error:
            "Irongate Rejection: Monetary-only ESG data is strictly forbidden. Submit physical units (KWH, LITERS, KILOMETERS).",
        },
        { status: 400 },
      );
    }

    // 2) Validate physical unit and mandatory forensic identity.
    const unitRaw = typeof body.unit === "string" ? body.unit.trim().toUpperCase() : "";
    const quantityRaw = body.quantity;
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
    const metadata =
      body.metadata != null && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined;

    if (!unitRaw || !ALLOWED_UNITS.has(unitRaw as PhysicalUnit)) {
      return NextResponse.json({ error: "Invalid or missing physical unit." }, { status: 400 });
    }

    if (quantityRaw == null || !tenantId) {
      return NextResponse.json(
        { error: "Missing required fields (quantity, tenantId)." },
        { status: 400 },
      );
    }

    const result = await processPhysicalEsgMetric({
      unit: unitRaw as PhysicalUnit,
      quantity: quantityRaw as bigint | number | string,
      tenantId,
      metadata,
    });

    return NextResponse.json(
      {
        status: "Irongate Validation Passed / Atomic Receipt Sealed",
        payload: {
          metricId: result.metricId,
          auditLogId: result.auditLogId,
          unit: result.unit,
          quantity: result.quantity,
          carbonEquivalent: result.carbonEquivalent,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

