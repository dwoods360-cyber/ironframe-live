export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import {
  formatUserInteractionAuditEntry,
  type UserInteractionClickPayload,
} from "@/app/lib/auditUserInteraction";

function parsePayload(body: unknown): UserInteractionClickPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const o = body as Record<string, unknown>;
  if (o.action !== "USER_INTERACTION_CLICK") {
    return null;
  }
  const targetLabel = typeof o.targetLabel === "string" ? o.targetLabel.trim() : "";
  if (!targetLabel) {
    return null;
  }
  const tenantScopeRaw = o.tenantScope;
  const tenantScope =
    tenantScopeRaw && typeof tenantScopeRaw === "object" && !Array.isArray(tenantScopeRaw)
      ? {
          uuid:
            typeof (tenantScopeRaw as { uuid?: unknown }).uuid === "string"
              ? (tenantScopeRaw as { uuid: string }).uuid
              : null,
          key:
            typeof (tenantScopeRaw as { key?: unknown }).key === "string"
              ? (tenantScopeRaw as { key: string }).key
              : null,
          label:
            typeof (tenantScopeRaw as { label?: unknown }).label === "string"
              ? (tenantScopeRaw as { label: string }).label
              : null,
        }
      : { uuid: null, key: null, label: null };

  return {
    action: "USER_INTERACTION_CLICK",
    targetId: typeof o.targetId === "string" ? o.targetId : null,
    targetName: typeof o.targetName === "string" ? o.targetName : null,
    targetLabel,
    componentContext:
      typeof o.componentContext === "string" && o.componentContext.trim()
        ? o.componentContext.trim()
        : "dashboard",
    tenantScope,
    path: typeof o.path === "string" ? o.path : "/",
    actorId: typeof o.actorId === "string" ? o.actorId : undefined,
  };
}

/**
 * POST /api/audit/log — Ironscribe-formatted user interaction events for Live Audit Ledger.
 */
export async function POST(request: NextRequest) {
  noStore();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid interaction payload" }, { status: 400 });
  }

  const actorHeader = request.headers.get("x-ironframe-user-id")?.trim();
  if (actorHeader) {
    payload.actorId = actorHeader;
  }

  const { ledgerEntry, ironcastLine, headline } = formatUserInteractionAuditEntry(payload);

  return NextResponse.json(
    {
      ok: true,
      action: payload.action,
      headline,
      ironscribeParsed: true,
      ledgerEntry,
      ironcastLine,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
