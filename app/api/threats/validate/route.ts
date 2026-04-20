import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
 * POST { ids: string[] } — returns { validIds: string[] } subset that exist in DB.
 * Used by Sync & Reconcile to remove ghost cards (ids missing from ActiveRisk / ThreatEvent).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ids?: string[] };
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
        where: { id: { in: riskIds } },
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
          where: { id: { in: threatEventIds } },
          select: { id: true },
        }),
        prisma.simThreatEvent.findMany({
          where: { id: { in: threatEventIds } },
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
