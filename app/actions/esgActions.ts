"use server";

import { prismaAdmin } from "@/lib/prismaAdmin";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export type LiveEsgTelemetryRow = {
  id: string;
  createdAt: string;
  tenantId: string;
  unit: "KWH" | "LITERS" | "KILOMETERS";
  quantity: string;
  carbonEquivalent: string;
  metadata: Record<string, unknown> | null;
  auditLog: {
    id: string;
    createdAt: string;
    operator: string;
    botType: string;
  };
};

/**
 * Sprint 9.2: live ESG telemetry feed for physical-unit Ironbloom metrics.
 * Returns JSON-safe strings for BigInt fields to avoid hydration issues.
 */
export async function fetchLiveEsgTelemetry(): Promise<LiveEsgTelemetryRow[]> {
  const tenantId = await getActiveTenantUuidFromCookies();
  const rows = await prismaAdmin.ironbloomEsgMetric.findMany({
    ...(tenantId ? { where: { tenantId } } : {}),
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      auditLog: {
        select: {
          id: true,
          createdAt: true,
          operator: true,
          botType: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    tenantId: row.tenantId,
    unit: row.unit,
    quantity: row.quantity.toString(),
    carbonEquivalent: row.carbonEquivalent.toString(),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    auditLog: {
      id: row.auditLog.id,
      createdAt: row.auditLog.createdAt.toISOString(),
      operator: row.auditLog.operator,
      botType: row.auditLog.botType,
    },
  }));
}

