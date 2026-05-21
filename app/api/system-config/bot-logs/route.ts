import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

function toJsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export async function GET() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ logs: [] as unknown[] });
  }

  const rows = await prisma.botAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      createdAt: true,
      operator: true,
      botType: true,
      disposition: true,
      mitigatedValueCents: true,
      metadata: true,
    },
  });

  const logs = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    operator: row.operator,
    botType: row.botType,
    disposition: row.disposition,
    mitigatedValueCents:
      row.mitigatedValueCents == null ? null : row.mitigatedValueCents.toString(),
    metadata: toJsonSafe(row.metadata),
  }));

  return NextResponse.json({ logs });
}

