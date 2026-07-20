import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { runProductKnowledgeOps } from "@/app/lib/server/productKnowledgeOpsCore";
import { operationsPortalErrorResponse } from "@/app/lib/server/operationsPortalHttp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET  — knowledge:check (diff only)
 * POST — knowledge:sync when apply allowed (local/writable ops host); never restarts workers
 */
export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const result = runProductKnowledgeOps({ apply: false });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch (err) {
    return operationsPortalErrorResponse(err, "Product knowledge check");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let apply = true;
  try {
    const body = (await request.json().catch(() => ({}))) as { apply?: boolean };
    if (body.apply === false) apply = false;
  } catch {
    apply = true;
  }

  try {
    const result = runProductKnowledgeOps({ apply });
    const status = result.applyBlockedReason ? 403 : result.ok ? 200 : 409;
    return NextResponse.json(result, { status });
  } catch (err) {
    return operationsPortalErrorResponse(err, "Product knowledge sync");
  }
}
