import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCompanyIdForTenantUuid } from "@/app/lib/grc/clearanceThreatResolve";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

/** Extract ActiveRisk id (BigInt) from pipeline card id (e.g. "center-risk-1", "risk-1", "1"). */
function parseActiveRiskId(cardId: string): string | null {
  const prefixed = cardId.match(/^(?:center-)?risk-(\d+)$/);
  if (prefixed) return prefixed[1];
  if (/^\d+$/.test(cardId)) return cardId;
  return null;
}

/** CUID-like: typically 25 chars, starts with 'c'. */
function isCuid(id: string): boolean {
  return id.length >= 20 && id.length <= 30 && /^c[a-z0-9]+$/i.test(id);
}

/**
 * POST { ids: string[] } — returns { validIds: string[] } subset that exist in DB for the active tenant.
 * Used by Sync & Reconcile to remove ghost cards (ids missing from ActiveRisk / ThreatEvent).
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await assertAuthenticatedIronguardTenantOr403(request);
    if (!guard.ok) return guard.response;

    const companyId = await getCompanyIdForTenantUuid(guard.tenantUuid);
    if (companyId == null) {
      return NextResponse.json({ validIds: [] });
    }

    let body: { ids?: string[] } = {};
    try {
      const raw = await request.text();
      if (raw.trim()) {
        body = JSON.parse(raw) as { ids?: string[] };
      }
    } catch {
      return NextResponse.json({ validIds: [] });
    }
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ validIds: [] });
    }

    const validIds: string[] = [];

    const activeRiskIds: string[] = [];
    const threatEventIds: string[] = [];

    for (const id of ids) {
      const riskId = parseActiveRiskId(id);
      if (riskId) activeRiskIds.push(riskId);
      else if (isCuid(id)) threatEventIds.push(id);
    }

    if (activeRiskIds.length > 0) {
      const riskIds = activeRiskIds.map((s) => BigInt(s));
      const found = await prisma.activeRisk.findMany({
        where: { id: { in: riskIds }, company_id: companyId },
        select: { id: true },
      });
      const existingRiskIds = new Set(found.map((r) => r.id.toString()));
      for (const id of ids) {
        const riskId = parseActiveRiskId(id);
        if (riskId && existingRiskIds.has(riskId)) validIds.push(id);
      }
    }

    if (threatEventIds.length > 0) {
      const [prodRows, simRows] = await Promise.all([
        prisma.threatEvent.findMany({
          where: { id: { in: threatEventIds }, tenantCompanyId: companyId },
          select: { id: true },
        }),
        prisma.riskEvent.findMany({
          where: { id: { in: threatEventIds }, tenantCompanyId: companyId },
          select: { id: true },
        }),
      ]);
      const existing = new Set([
        ...prodRows.map((r) => r.id),
        ...simRows.map((r) => r.id),
      ]);
      for (const id of threatEventIds) {
        if (existing.has(id) && ids.includes(id)) validIds.push(id);
      }
    }

    return NextResponse.json({ validIds: [...new Set(validIds)] });
  } catch (e) {
    console.error("[threats/validate]", e);
    return NextResponse.json({ validIds: [], error: String(e) }, { status: 500 });
  }
}
