import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import {
  DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY,
  type DiagnosticAbortLogRow,
} from "@/app/lib/opsupport/diagnosticAbortTypes";
import { persistDiagnosticAbortLog } from "@/app/lib/server/persistDiagnosticAbortLog";
import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AbortBody = {
  reason?: string;
  surface?: string;
  path?: string;
  method?: string;
};

function parseAbortBody(body: unknown): AbortBody | null {
  if (body == null || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (!reason) return null;
  return {
    reason: reason.slice(0, 512),
    surface: typeof record.surface === "string" ? record.surface.trim().slice(0, 256) : undefined,
    path: typeof record.path === "string" ? record.path.trim().slice(0, 1024) : undefined,
    method: typeof record.method === "string" ? record.method.trim().slice(0, 16) : undefined,
  };
}

function rowFromHealthLog(row: {
  id: string;
  createdAt: Date;
  detail: string | null;
  meta: unknown;
}): DiagnosticAbortLogRow {
  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {};
  const reason =
    typeof meta.reason === "string"
      ? meta.reason
      : row.detail?.split(" | ")[0]?.trim() ?? "unknown";
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    reason,
    surface: typeof meta.surface === "string" ? meta.surface : null,
    path: typeof meta.path === "string" ? meta.path : null,
    method: typeof meta.method === "string" ? meta.method : null,
  };
}

/** Recent cooperative abort / disconnect events for OpSupport diagnostics. */
export async function GET() {
  noStore();
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error, rows: [] }, { status: 403 });
  }

  const rows = await prisma.systemHealthLog.findMany({
    where: { serviceKey: DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY },
    orderBy: { createdAt: "desc" },
    take: 120,
    select: { id: true, createdAt: true, detail: true, meta: true },
  });

  return NextResponse.json(
    {
      fetchedAt: new Date().toISOString(),
      rows: rows.map(rowFromHealthLog),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

/** Client-ingested abort telemetry (deduped client-side; persisted for diagnostics). */
export async function POST(request: Request) {
  noStore();
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAbortBody(body);
  if (!parsed?.reason) {
    return NextResponse.json({ ok: false, error: "reason is required." }, { status: 400 });
  }

  try {
    await persistDiagnosticAbortLog({
      reason: parsed.reason,
      surface: parsed.surface,
      path: parsed.path,
      method: parsed.method,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/opsupport/diagnostic-abort] persist failed", error);
    return NextResponse.json({ ok: false, error: "Persist failed." }, { status: 500 });
  }
}
