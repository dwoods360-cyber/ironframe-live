import { PhysicalUnit, Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/prismaAdmin";

// Baseline conversion constants (grams CO2e per physical unit), BigInt-only.
const CO2E_GRAMS_PER_KWH = 385n;
const CO2E_GRAMS_PER_LITER_FUEL = 2310n;
const CO2E_GRAMS_PER_KILOMETER = 120n;

const CONVERSION_BY_UNIT: Record<PhysicalUnit, bigint> = {
  KWH: CO2E_GRAMS_PER_KWH,
  LITERS: CO2E_GRAMS_PER_LITER_FUEL,
  KILOMETERS: CO2E_GRAMS_PER_KILOMETER,
};

export type ProcessPhysicalEsgMetricPayload = {
  unit: PhysicalUnit;
  quantity: bigint | number | string;
  tenantId: string;
  metadata?: Record<string, unknown>;
};

export type ProcessPhysicalEsgMetricResult = {
  metricId: string;
  auditLogId: string;
  unit: PhysicalUnit;
  quantity: string;
  carbonEquivalent: string;
};

function parseQuantityToBigInt(raw: bigint | number | string): bigint {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw) && Number.isInteger(raw)) return BigInt(raw);
  if (typeof raw === "string" && raw.trim().length > 0) return BigInt(raw.trim());
  throw new Error("Invalid quantity. Must be an integer BigInt-compatible value.");
}

/**
 * Agent 18 (Ironbloom): validate physical unit quantity, compute CO2e with BigInt math,
 * and atomically seal BotAuditLog + IronbloomEsgMetric in one transaction.
 */
export async function processPhysicalEsgMetric(
  payload: ProcessPhysicalEsgMetricPayload,
): Promise<ProcessPhysicalEsgMetricResult> {
  const tenantId = payload.tenantId?.trim();
  if (!tenantId) {
    throw new Error("Missing tenantId.");
  }

  const unit = payload.unit;
  const factor = CONVERSION_BY_UNIT[unit];
  if (!factor) {
    throw new Error("Invalid physical unit.");
  }

  const quantity = parseQuantityToBigInt(payload.quantity);
  if (quantity <= 0n) {
    throw new Error("Quantity must be greater than 0.");
  }

  const carbonEquivalent = quantity * factor;
  const metadataObj =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : undefined;

  const result = await prismaAdmin.$transaction(async (tx) => {
    const audit = await tx.botAuditLog.create({
      data: {
        tenantId,
        operator: "SYSTEM_IRONBLOOM_AUTO",
        botType: "ESG_INGESTION",
        disposition: "PASS",
        metadata: {
          source: "IRONBLOOM_INGEST_API",
          unit,
          quantity: quantity.toString(),
          carbonEquivalent: carbonEquivalent.toString(),
          ...(metadataObj ? { metadata: metadataObj } : {}),
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    const metric = await tx.ironbloomEsgMetric.create({
      data: {
        unit,
        quantity,
        carbonEquivalent,
        metadata: metadataObj as Prisma.InputJsonValue | undefined,
        tenantId,
        auditLogId: audit.id,
      },
      select: { id: true, unit: true, quantity: true, carbonEquivalent: true },
    });

    return { metric, auditLogId: audit.id };
  });

  return {
    metricId: result.metric.id,
    auditLogId: result.auditLogId,
    unit: result.metric.unit,
    quantity: result.metric.quantity.toString(),
    carbonEquivalent: result.metric.carbonEquivalent.toString(),
  };
}

