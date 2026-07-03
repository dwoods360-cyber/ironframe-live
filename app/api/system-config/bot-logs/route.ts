import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

function toJsonSafe(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;

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
      metadata: true,
    },
  });

  const logs = rows.map((row) => {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;
    const cents = meta?.mitigatedValueCents ?? meta?.mitigated_value_cents;
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      operator: row.operator,
      botType: row.botType,
      disposition: row.disposition,
      mitigatedValueCents:
        cents == null ? null : typeof cents === "bigint" ? cents.toString() : String(cents),
      metadata: toJsonSafe(row.metadata),
    };
  });

  return NextResponse.json({ logs });
}
